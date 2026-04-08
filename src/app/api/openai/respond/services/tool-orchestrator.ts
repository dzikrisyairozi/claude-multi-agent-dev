import { ToolCall, ToolExecutionContext } from "../types";
import { ProgressMessageGenerator } from "../utils/progress-messages";
import { executeToolCalls } from "../utils/tool-execution";
import { extractToolMetadata } from "../utils/stream";
import { StreamManager } from "./stream-manager";
import { ToolExecutionError } from "../errors";
import type { StreamedFunctionCall } from "../utils/openai-client";

interface ToolResponse {
  role: string;
  tool_call_id: string;
  content: string;
}

/**
 * Tool Orchestrator
 * Processes function calls collected from a Responses API stream,
 * executes the tools, and returns updated input for the next round.
 */
export interface SearchCallInfo {
  query: string;
  results: { documentId: string; fileName: string; mimeType: string | null; contentPreview: string }[];
}

export class ToolOrchestrator {
  private allToolMetadata: Record<string, unknown> = {};
  private _lastSearchCall: SearchCallInfo | null = null;

  constructor(private streamManager: StreamManager) {}

  get lastSearchCall(): SearchCallInfo | null {
    return this._lastSearchCall;
  }

  /**
   * @param functionCalls - Function calls extracted from the stream
   * @param outputItems - All output items from the response (reasoning, function_call, message)
   *                      Must be passed back to the model per OpenAI docs for reasoning models.
   */
  async processFunctionCalls(
    functionCalls: StreamedFunctionCall[],
    outputItems: Record<string, unknown>[],
    context: ToolExecutionContext,
    controller: ReadableStreamDefaultController<Uint8Array>
  ): Promise<{
    newInputItems: Record<string, unknown>[];
    metadata: Record<string, unknown>;
  }> {
    const toolCalls: ToolCall[] = functionCalls.map((fc) => ({
      id: fc.callId,
      type: "function" as const,
      function: {
        name: fc.name,
        arguments: fc.arguments,
      },
    }));

    for (const toolCall of toolCalls) {
      const progressMessage = ProgressMessageGenerator.generate(toolCall);
      this.streamManager.sendProgress(controller, progressMessage);
    }

    const executionTimer = `[Timing] Tool execution (${toolCalls.map((tc) => tc.function.name).join(", ")})`;
    console.time(executionTimer);

    let toolResponses: ToolResponse[];
    try {
      toolResponses = await executeToolCalls(toolCalls, context);
    } catch (error) {
      throw new ToolExecutionError(
        toolCalls.map((tc) => tc.function.name).join(", "),
        error instanceof Error ? error : new Error(String(error))
      );
    }
    console.timeEnd(executionTimer);

    const roundMetadata = extractToolMetadata(toolResponses);
    this.allToolMetadata = { ...this.allToolMetadata, ...roundMetadata };

    // Capture search call info for background reranking
    for (let i = 0; i < toolCalls.length; i++) {
      if (toolCalls[i].function.name === "semantic_search") {
        try {
          const args = JSON.parse(toolCalls[i].function.arguments);
          const parsed = JSON.parse(toolResponses[i].content);
          if (Array.isArray(parsed) && parsed.length > 1) {
            this._lastSearchCall = {
              query: args.query,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              results: parsed.map((r: any) => ({
                documentId: r.documentId,
                fileName: r.file?.name ?? "",
                mimeType: r.file?.mimeType ?? null,
                contentPreview: r.content ?? "",
              })),
            };
          }
        } catch { /* ignore parse errors */ }
      }
    }

    // Pass back ALL output items (reasoning + function_call items) from the response,
    // plus our function_call_output results. Per OpenAI docs:
    // "reasoning items returned in model responses with tool calls must also be passed back"
    const functionCallOutputs = toolResponses.map((tr) => ({
      type: "function_call_output",
      call_id: tr.tool_call_id,
      output: tr.content,
    }));

    return {
      newInputItems: [...outputItems, ...functionCallOutputs],
      metadata: this.allToolMetadata,
    };
  }

  getMetadata(): Record<string, unknown> {
    return this.allToolMetadata;
  }
}
