import { AI_CONFIG } from "../config/ai.config";
import { ProgressEvent, ToolMetadataEvent } from "../types";

/**
 * Stream Manager
 * Handles SSE encoding, progress events, metadata, and response piping.
 */
export class StreamManager {
  private encoder = new TextEncoder();

  sendProgress(
    controller: ReadableStreamDefaultController<Uint8Array>,
    message: string
  ): void {
    const progressEvent: ProgressEvent = { type: "progress", message };
    controller.enqueue(
      this.encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`)
    );
  }

  sendMetadata(
    controller: ReadableStreamDefaultController<Uint8Array>,
    metadata: Record<string, unknown>
  ): void {
    if (Object.keys(metadata).length === 0) return;
    const metadataEvent: ToolMetadataEvent = {
      type: "tool_metadata",
      ...metadata,
    };
    controller.enqueue(
      this.encoder.encode(`data: ${JSON.stringify(metadataEvent)}\n\n`)
    );
  }

  sendText(
    controller: ReadableStreamDefaultController<Uint8Array>,
    content: string
  ): void {
    const created = Math.floor(Date.now() / 1000);
    const contentChunk = {
      id: `tpl_${created}`,
      object: "chat.completion.chunk",
      created,
      model: AI_CONFIG.MODEL,
      choices: [
        { index: 0, delta: { role: "assistant", content }, finish_reason: null },
      ],
    };
    const finishChunk = {
      id: `tpl_${created}_done`,
      object: "chat.completion.chunk",
      created,
      model: AI_CONFIG.MODEL,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    };
    controller.enqueue(
      this.encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`)
    );
    controller.enqueue(
      this.encoder.encode(`data: ${JSON.stringify(finishChunk)}\n\n`)
    );
    controller.enqueue(this.encoder.encode("data: [DONE]\n\n"));
  }

  createStreamingResponse(stream: ReadableStream<Uint8Array>): Response {
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  /**
   * Convert Chat Completions tool format → Responses API tool format.
   */
  convertToolsForResponsesAPI(tools: Record<string, unknown>[]): Record<string, unknown>[] {
    return tools.map((tool: Record<string, unknown>) => {
      const fn = tool.function as Record<string, unknown> | undefined;
      if (fn) {
        return {
          type: "function",
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters,
        };
      }
      return tool;
    });
  }

  /**
   * Create a Responses API streaming payload (with or without tools).
   */
  createStreamingPayload(
    input: Record<string, unknown>[],
    instructions?: string,
    tools?: Record<string, unknown>[]
  ) {
    const convertedTools =
      tools && tools.length > 0
        ? this.convertToolsForResponsesAPI(tools)
        : undefined;
    return {
      model: AI_CONFIG.MODEL,
      instructions,
      input,
      max_output_tokens: AI_CONFIG.MAX_TOKENS,
      reasoning: { effort: AI_CONFIG.REASONING_EFFORT },
      text: { verbosity: AI_CONFIG.VERBOSITY },
      tools: convertedTools,
      tool_choice: convertedTools ? "auto" : undefined,
    };
  }
}
