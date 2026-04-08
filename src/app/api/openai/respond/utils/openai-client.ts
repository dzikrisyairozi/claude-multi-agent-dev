import { NextResponse } from "next/server";
import OpenAI from "openai";

const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: OPENAI_BASE_URL,
  maxRetries: 3,
  timeout: 60000,
});

export type StreamedFunctionCall = {
  callId: string;
  name: string;
  arguments: string;
};

export type StreamResult = {
  textOnly: boolean;
  functionCalls: StreamedFunctionCall[];
  /** All output items from the response (reasoning, function_call, message).
   *  Must be passed back to the model alongside function_call_output items. */
  outputItems: Record<string, unknown>[];
};

/**
 * Single streaming Responses API call with tools.
 *
 * Text deltas → forwarded to controller as SSE immediately.
 * Function calls → collected and returned (not streamed).
 * Reasoning items → collected for pass-back on tool call rounds.
 */
export async function streamResponsesWithTools(
  payload: {
    model: string;
    instructions?: string;
    input: Record<string, unknown>[];
    tools?: Record<string, unknown>[];
    tool_choice?: string;
    max_output_tokens?: number;
    reasoning?: { effort?: string };
  },
  controller: ReadableStreamDefaultController<Uint8Array>
): Promise<StreamResult> {
  const encoder = new TextEncoder();
  const created = Math.floor(Date.now() / 1000);
  let chunkIndex = 0;

  const functionCalls: StreamedFunctionCall[] = [];
  const outputItems: Record<string, unknown>[] = [];
  let hasText = false;

  try {
    const stream = await openai.responses.create({
      ...payload,
      stream: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const event of stream as any) {
      const type = event.type as string;

      // ── Text streaming ──
      if (type === "response.output_text.delta") {
        hasText = true;
        const chunk = {
          id: `resp_${created}_${chunkIndex++}`,
          object: "chat.completion.chunk",
          created,
          model: payload.model,
          choices: [
            { index: 0, delta: { content: event.delta }, finish_reason: null },
          ],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
        );
      } else if (type === "response.output_text.done") {
        const finishChunk = {
          id: `resp_${created}_done`,
          object: "chat.completion.chunk",
          created,
          model: payload.model,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(finishChunk)}\n\n`)
        );
      } else if (type === "response.completed") {
        if (hasText) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      }

      // ── Collect output items (for pass-back on tool rounds) ──
      // response.output_item.done gives us the completed item
      if (type === "response.output_item.done") {
        const item = event.item;
        if (item) {
          outputItems.push(item as Record<string, unknown>);
        }
      }

      // ── Function call: extract from completed item ──
      if (type === "response.output_item.done") {
        const item = event.item;
        if (item?.type === "function_call") {
          console.log(
            `[OpenAI Stream] function_call done: name=${item.name} call_id=${item.call_id}`
          );
          functionCalls.push({
            callId: item.call_id,
            name: item.name,
            arguments: item.arguments,
          });
        }
      }
    }
    console.log(
      `[OpenAI Stream] Stream ended: hasText=${hasText}, functionCalls=${functionCalls.length}, outputItems=${outputItems.length}`
    );
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(
        "[OpenAI API Error]",
        error.status,
        error.message,
        JSON.stringify(error.error)
      );
      throw new NextResponse(
        JSON.stringify({
          error: error.message || "OpenAI returned an error response",
          details: { status: error.status, code: error.code, type: error.type },
        }),
        { status: error.status || 500 }
      );
    }
    throw error;
  }

  return {
    textOnly: functionCalls.length === 0,
    functionCalls,
    outputItems,
  };
}

export { openai };
