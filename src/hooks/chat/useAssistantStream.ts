import { useCallback } from "react";
import { toast } from "sonner";
import { streamAssistantResponse } from "@/service/openai/chat";
import { ConversationMessage } from "@/types/conversation";
import { ExtractedToolMetadata } from "@/types/file";
import { OpenAIChatMessage, OpenAIChatRequest } from "@/types/openai";

const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

type StreamFn = (
  payload: OpenAIChatRequest,
  options?: { accessToken?: string; signal?: AbortSignal }
) => Promise<ReadableStream<Uint8Array>>;

type StreamOptions = {
  formatMessages: (
    conversation: ConversationMessage[],
    adHocContext?: string,
  ) => OpenAIChatMessage[];
  accessToken?: string;
  language?: "en" | "ja";
  streamFn?: StreamFn;
};

type StreamParams = {
  threadId: string;
  conversation: ConversationMessage[];
  adHocContext?: string;
  onChunk?: (chunk: string, accumulated: string) => void;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
};

export function useAssistantStream({
  formatMessages,
  accessToken,
  language,
  streamFn,
}: StreamOptions) {
  const doStream = streamFn ?? streamAssistantResponse;
  const streamAssistantReply = useCallback(
    async ({ threadId, conversation, adHocContext, onChunk, onProgress, signal }: StreamParams) => {
      const sanitizedConversation = conversation;

      const openAiMessages = formatMessages(conversation, adHocContext);
      const responseStream = await doStream(
        {
          threadId,
          messages: openAiMessages,
          language,
        },
        { accessToken, signal },
      );

      if (!responseStream) {
        throw new Error("No response stream received from assistant");
      }

      const reader = responseStream.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulated = "";
      let sawDoneToken = false;
      const toolMetadata: ExtractedToolMetadata = {};

      let aborted = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          buffer += decoder.decode(value, { stream: true });

          const segments = buffer.split("\n\n");
          buffer = segments.pop() ?? "";

          for (const segment of segments) {
            const lines = segment.split("\n");
            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data) continue;

              if (data === "[DONE]") {
                sawDoneToken = true;
                // Don't break — keep reading for post-stream events (e.g. reranked_results)
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                // Check for progress event (tool execution status)
                if (parsed?.type === "progress") {
                  onProgress?.(parsed.message);
                  continue;
                }

                // Check for tool_metadata event (sent by our custom stream)
                if (parsed?.type === "tool_metadata") {
                  if (parsed.approval_request_id) {
                    toolMetadata.approval_request_id =
                      parsed.approval_request_id;
                  }
                  if (parsed.approval_request_ids) {
                    toolMetadata.approval_request_ids =
                      parsed.approval_request_ids;
                  }
                  if (parsed.files && Array.isArray(parsed.files)) {
                    toolMetadata.files = parsed.files;
                  }
                  if (parsed.rag_sources && Array.isArray(parsed.rag_sources)) {
                    toolMetadata.rag_sources = parsed.rag_sources;
                  }
                  if (parsed.ringi_proposal) {
                    toolMetadata.ringi_proposal = parsed.ringi_proposal;
                  }
                  if (parsed.folder_id) {
                    toolMetadata.folder_id = parsed.folder_id;
                  }
                  continue;
                }

                // Filtered results from background LLM relevance filter
                if (parsed?.type === "filtered_results") {
                  if (parsed.relevantDocumentIds && Array.isArray(parsed.relevantDocumentIds)) {
                    toolMetadata.filtered_document_ids = parsed.relevantDocumentIds;
                  }
                  continue;
                }

                // Dev-only timing event
                if (parsed?.type === "dev_timing" && isDev) {
                  toast.info(
                    `DEV ONLY: total: ${parsed.totalMs} ms, openai response: ${parsed.openaiMs} ms`,
                    { duration: 5000 },
                  );
                  continue;
                }

                const delta = parsed?.choices?.[0]?.delta;
                const chunk = (() => {
                  if (!delta?.content) return "";
                  if (typeof delta.content === "string") return delta.content;
                  if (Array.isArray(delta.content)) {
                    return delta.content
                      .map((item: Record<string, unknown>) => {
                        if (typeof item === "string") return item;
                        if (item?.type === "text") return item.text ?? "";
                        return item?.content ?? "";
                      })
                      .join("");
                  }
                  return "";
                })();

                if (chunk) {
                  accumulated += chunk;
                  // Call onChunk callback with the new chunk and accumulated text
                  onChunk?.(chunk, accumulated);
                }
              } catch {
                // Ignore malformed chunks
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          aborted = true;
        } else {
          throw err;
        }
      } finally {
        reader.releaseLock();
      }

      // Detect interrupted stream (but not user-initiated abort)
      if (!sawDoneToken && !aborted && accumulated.trim()) {
        accumulated += "\n\n_(Response was interrupted. The above may be incomplete. Please try again if needed.)_";
      }

      const finalContent =
        accumulated.trim() ||
        "I'm sorry, I wasn't able to produce a response. Please try again.";

      return {
        finalContent,
        sanitizedConversation,
        toolMetadata,
      };
    },
    [accessToken, formatMessages, language, doStream],
  );

  return { streamAssistantReply };
}
