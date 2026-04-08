import { SupabaseClient } from "@supabase/supabase-js";
import { getToolHandler } from "../tools";

const TOOL_TIMEOUT_MS = 30_000;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  toolName: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${toolName} timed out after ${ms / 1000}s`)),
        ms
      )
    ),
  ]);
};

export const executeToolCalls = async (
  toolCalls: any[],
  { supabase, user }: { supabase: SupabaseClient; user: any }
) => {
  const toolResponses = await Promise.all(
    toolCalls.map(async (call) => {
      const handler = getToolHandler(call.function.name);

      if (!handler) {
        console.warn(`No handler found for tool: ${call.function.name}`);
        return {
          role: "tool" as const,
          tool_call_id: call.id,
          content: JSON.stringify({
            error: `Unknown tool: ${call.function.name}`,
          }),
        };
      }

      let parsedArgs: any = {};
      try {
        parsedArgs = JSON.parse(call.function.arguments || "{}");
      } catch {
        return {
          role: "tool" as const,
          tool_call_id: call.id,
          content: JSON.stringify({ error: "Failed to parse tool arguments" }),
        };
      }

      // Log tool selection
      console.log(`[Tool] Selected: ${call.function.name}`, parsedArgs.action ? `(action: ${parsedArgs.action})` : '');

      // Log semantic search params for debugging
      if (call.function.name === 'search_user_documents') {
        console.log(`[Tool] search_user_documents params:`, {
          query: parsedArgs.query,
          limit: parsedArgs.limit,
          similarityThreshold: parsedArgs.similarityThreshold,
        });
      }

      // Item 5: UUID validation
      const uuidFields = [
        "documentId",
        "id",
        "folderId",
        "approvalRequestId",
      ];
      for (const field of uuidFields) {
        if (
          parsedArgs[field] &&
          typeof parsedArgs[field] === "string" &&
          !UUID_REGEX.test(parsedArgs[field])
        ) {
          return {
            role: "tool" as const,
            tool_call_id: call.id,
            content: JSON.stringify({
              error: `Invalid ${field}: "${parsedArgs[field]}" is not a valid UUID. Use manage_documents(search) or manage_documents(list) to find the correct UUID first.`,
            }),
          };
        }
      }

      try {
        // Item 13: Timeout wrapper
        const result = await withTimeout(
          handler(parsedArgs, { supabase, user }),
          TOOL_TIMEOUT_MS,
          call.function.name
        );
        return {
          role: "tool" as const,
          tool_call_id: call.id,
          content: JSON.stringify(result),
        };
      } catch (error: any) {
        // Item 14: Actionable error messages
        const toolName = call.function.name;
        const errorMessage = error.message || "Unknown error";
        return {
          role: "tool" as const,
          tool_call_id: call.id,
          content: JSON.stringify({
            error: `${toolName} failed: ${errorMessage}`,
            suggestion:
              "Try a different approach, use a different tool, or ask the user for more information.",
          }),
        };
      }
    })
  );

  return toolResponses;
};
