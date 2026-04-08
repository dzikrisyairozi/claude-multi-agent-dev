export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { OpenAIChatRequest } from "@/types/openai";
import { streamResponsesWithTools } from "@/app/api/openai/respond/utils/openai-client";
import { AI_CONFIG } from "@/app/api/openai/respond/config/ai.config";
import { StreamManager } from "@/app/api/openai/respond/services/stream-manager";
import {
  AuthenticationError,
  ThreadNotFoundError,
  ValidationError,
  ConfigurationError,
  OpenAIError,
} from "@/app/api/openai/respond/errors";
import { buildMgappSystemPrompt } from "./prompts/system";
import { getMgappToolsDefinitions, executeMgappTool } from "./tools";

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
      .eq("mode", "mgapp")
      .single();

    if (threadError) {
      throw new ThreadNotFoundError(body.threadId);
    }
  }

  return { supabase, user };
};

function convertToResponsesInput(
  messages: OpenAIChatRequest["messages"]
): Record<string, unknown>[] {
  const input: Record<string, unknown>[] = [];

  for (const msg of messages) {
    if (msg.role === "system" || msg.role === "tool") continue;

    if (msg.role === "user") {
      input.push({
        role: "user",
        content: [{ type: "input_text", text: msg.content }],
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
  try {
    const body = (await req.json()) as OpenAIChatRequest;

    if (!body?.messages?.length) {
      throw new ValidationError("Messages are required");
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new ConfigurationError("OPENAI_API_KEY is not configured");
    }

    await ensureUserAndThread(req, body);

    const tools = getMgappToolsDefinitions();
    const systemPrompt = buildMgappSystemPrompt(body.language ?? "ja");
    const responsesInput = convertToResponsesInput(body.messages);

    const streamManager = new StreamManager();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let input = responsesInput;
          let round = 0;

          while (round < AI_CONFIG.MAX_TOOL_ROUNDS) {
            const payload = streamManager.createStreamingPayload(
              input,
              systemPrompt,
              tools
            );

            const result = await streamResponsesWithTools(payload, controller);

            if (result.textOnly) {
              break;
            }

            // Execute tool calls
            const newInputItems: Record<string, unknown>[] = [
              ...result.outputItems,
            ];

            for (const fc of result.functionCalls) {
              console.log(`[Mgapp Tools] Executing: ${fc.name}`);
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(fc.arguments);
              } catch {
                args = {};
              }

              const toolResult = await executeMgappTool(fc.name, args);

              newInputItems.push({
                type: "function_call_output",
                call_id: fc.callId,
                output: toolResult,
              });
            }

            input = [...input, ...newInputItems];
            round++;
          }

          controller.close();
        } catch (error) {
          console.error(
            "[Mgapp Stream] Error:",
            error instanceof Error ? error.message : error
          );
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
    const message =
      error instanceof Error ? error.message : "Unable to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
