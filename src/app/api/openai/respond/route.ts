export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabaseServer } from "@/integrations/supabase/server";
import { OpenAIChatRequest } from "@/types/openai";
import { getToolsDefinitions } from "./tools";
import { streamResponsesWithTools } from "./utils/openai-client";
import { AI_CONFIG } from "./config/ai.config";
import { StreamManager } from "./services/stream-manager";
import { ToolOrchestrator } from "./services/tool-orchestrator";
import {
  AuthenticationError,
  ThreadNotFoundError,
  ValidationError,
  ConfigurationError,
  OpenAIError,
} from "./errors";
import { buildSystemPrompt } from "./prompts";
import { filterResultsWithLLM } from "@/service/openai/filterResults";

const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function getPresignedS3Url(filePath: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: filePath,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

const ensureUserAndThread = async (
  req: NextRequest,
  body: OpenAIChatRequest
) => {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthenticationError(userError?.message);
  }

  if (body.threadId) {
    const { error: threadError } = await supabase
      .from("ai_threads")
      .select("id")
      .eq("id", body.threadId)
      .single();

    if (threadError) {
      throw new ThreadNotFoundError(body.threadId);
    }
  }

  return { supabase, user };
};

async function convertToResponsesInput(
  messages: OpenAIChatRequest["messages"]
): Promise<Record<string, unknown>[]> {
  const input: Record<string, unknown>[] = [];

  for (const msg of messages) {
    if (msg.role === "system" || msg.role === "tool") continue;

    if (msg.role === "user") {
      const contentParts: Record<string, unknown>[] = [];

      if (msg.content) {
        contentParts.push({ type: "input_text", text: msg.content });
      }

      if (msg.files && msg.files.length > 0) {
        for (const file of msg.files) {
          if (file.fileUrl) {
            try {
              console.log(`[Route] File: "${file.name}" mime="${file.mimeType}" url="${file.fileUrl}"`);
              const presignedUrl = await getPresignedS3Url(file.fileUrl);
              // Images use input_image; documents use input_file
              const ext = file.name?.split(".").pop()?.toLowerCase();
              const isImage =
                file.mimeType?.startsWith("image/") ||
                ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext ?? "");
              console.log(`[Route] → ext="${ext}" isImage=${isImage} → type=${isImage ? "input_image" : "input_file"}`);
              if (isImage) {
                contentParts.push({
                  type: "input_image",
                  image_url: presignedUrl,
                });
              } else {
                contentParts.push({
                  type: "input_file",
                  file_url: presignedUrl,
                });
              }
            } catch (err) {
              console.warn(
                `[Route] Failed to presign URL for file "${file.name}":`,
                err
              );
            }
          }
        }
      }

      input.push({
        role: "user",
        content: contentParts.length > 0 ? contentParts : msg.content,
      });
    } else if (msg.role === "assistant") {
      if (msg.content) {
        input.push({
          role: "assistant",
          content: [{ type: "output_text", text: msg.content }],
        });
      }
    }
  }

  return input;
}

export async function POST(req: NextRequest) {
  const totalStart = Date.now();

  try {
    const body = (await req.json()) as OpenAIChatRequest;

    if (!body?.messages?.length) {
      throw new ValidationError("Messages are required");
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new ConfigurationError("OPENAI_API_KEY is not configured");
    }

    const { supabase, user } = await ensureUserAndThread(req, body);

    const tools = getToolsDefinitions();
    const systemPrompt = buildSystemPrompt(body.language ?? "en");
    const responsesInput = await convertToResponsesInput(body.messages);

    const streamManager = new StreamManager();
    const orchestrator = new ToolOrchestrator(streamManager);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let openaiMs = 0;

        try {
          let input = responsesInput;
          let round = 0;

          while (round < AI_CONFIG.MAX_TOOL_ROUNDS) {
            const roundStart = Date.now();

            const payload = streamManager.createStreamingPayload(
              input,
              systemPrompt,
              tools
            );

            console.log(`[Stream] Round ${round} starting with ${input.length} input items`);
            const result = await streamResponsesWithTools(payload, controller);
            openaiMs += Date.now() - roundStart;

            console.log(`[Stream] Round ${round} done: textOnly=${result.textOnly}, functionCalls=${result.functionCalls.length}`);
            if (result.textOnly) {
              break;
            }

            // Model called tools — execute them and loop
            console.log(
              `[Tools] Round ${round}: ${result.functionCalls.map((fc) => fc.name).join(", ")}`
            );

            const { newInputItems, metadata } =
              await orchestrator.processFunctionCalls(
                result.functionCalls,
                result.outputItems, // includes reasoning items for pass-back
                { supabase, user },
                controller
              );

            console.log(`[Stream] Metadata keys: ${Object.keys(metadata).join(", ") || "(none)"}`);
            if (metadata.ringi_proposal) {
              console.log(`[Stream] ringi_proposal detected — sending draft button`);
              streamManager.sendMetadata(controller, metadata);
              const lang = body.language ?? "en";
              const templateText =
                lang === "ja"
                  ? "稟議の下書きを準備しました。下のボタンをクリックして、内容を確認・編集してください。"
                  : "I've prepared a draft proposal. Click the button below to review and edit the details.";
              streamManager.sendText(controller, templateText);
              break;
            }

            streamManager.sendMetadata(controller, metadata);
            input = [...input, ...newInputItems];
            round++;
          }

          // Background LLM filter: remove irrelevant search results
          const searchCall = orchestrator.lastSearchCall;
          if (searchCall && searchCall.results.length > 1) {
            try {
              const relevantIds = await filterResultsWithLLM(
                searchCall.query,
                searchCall.results
              );
              // Only send if some results were filtered out
              if (relevantIds.length < searchCall.results.length) {
                const filterEvent = { type: "filtered_results", relevantDocumentIds: relevantIds };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(filterEvent)}\n\n`)
                );
                console.log(
                  `[Filter] Kept ${relevantIds.length}/${searchCall.results.length}: ${relevantIds.map((id) => id.slice(0, 8)).join(", ")}`
                );
              }
            } catch (err) {
              console.warn(`[Filter] Failed:`, err instanceof Error ? err.message : err);
            }
          }

          // Emit dev timing event (dev env only)
          const totalMs = Date.now() - totalStart;
          console.log(`[Timing] total: ${totalMs} ms, openai: ${openaiMs} ms`);

          if (isDev) {
            const devTiming = { type: "dev_timing", totalMs, openaiMs };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(devTiming)}\n\n`)
            );
          }

          controller.close();
        } catch (error) {
          console.error(`[Stream] Error in stream:`, error instanceof Error ? error.message : error);
          controller.error(error);
        }
      },
    });

    return streamManager.createStreamingResponse(stream);
  } catch (error: unknown) {
    if (error instanceof OpenAIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    if (error instanceof Response) {
      return error;
    }
    const message = error instanceof Error ? error.message : "Unable to process OpenAI request";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
