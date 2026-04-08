import { SupabaseClient } from "@supabase/supabase-js";
import { semanticSearchTool } from "./semantic-search";

export type ToolHandlerContext = {
  supabase: SupabaseClient;
  user: { id: string };
};

export type Tool = {
  definition: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  handler: (args: Record<string, unknown>, context: ToolHandlerContext) => Promise<unknown>;
};

export const toolsRegistry: Tool[] = [
  semanticSearchTool as unknown as Tool,
];

export const getToolsDefinitions = () => toolsRegistry.map((t) => t.definition);

export const getToolHandler = (toolName: string) => {
  return toolsRegistry.find((t) => t.definition.function.name === toolName)
    ?.handler;
};
