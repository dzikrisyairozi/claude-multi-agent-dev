import { knowledgeSearchDefinition, executeKnowledgeSearch } from "./knowledge-search";

export function getMgappToolsDefinitions(): Record<string, unknown>[] {
  return [knowledgeSearchDefinition];
}

export async function executeMgappTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_knowledge":
      return executeKnowledgeSearch(args as { query: string; category?: string });
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
