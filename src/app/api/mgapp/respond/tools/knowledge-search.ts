import { supabaseServer } from "@/integrations/supabase/server";

export const knowledgeSearchDefinition = {
  type: "function",
  function: {
    name: "search_knowledge",
    description:
      "Search the knowledge base for answers to staff questions. Use this tool before answering any question.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query — keywords from the user's question",
        },
        category: {
          type: "string",
          enum: [
            "hr",
            "product",
            "it",
            "legal",
            "facilities",
            "admin_finance",
          ],
          description:
            "Optional category filter: hr, product, it, legal, facilities, admin_finance",
        },
      },
      required: ["query"],
    },
  },
};

export async function executeKnowledgeSearch(args: {
  query: string;
  category?: string;
}): Promise<string> {
  const supabase = await supabaseServer();

  // Split query into keywords for ilike search
  const keywords = args.query
    .replace(/[？?！!。、]/g, " ")
    .split(/\s+/)
    .filter((k) => k.length > 1);

  let queryBuilder = supabase
    .from("mgapp_knowledge_entries")
    .select("*")
    .eq("is_active", true);

  if (args.category) {
    queryBuilder = queryBuilder.eq("category", args.category);
  }

  // Search across question and answer fields using OR of ilike patterns
  if (keywords.length > 0) {
    const orConditions = keywords
      .map((kw) => `question.ilike.%${kw}%,answer.ilike.%${kw}%`)
      .join(",");
    queryBuilder = queryBuilder.or(orConditions);
  }

  const { data, error } = await queryBuilder.limit(10);

  if (error) {
    return JSON.stringify({ error: error.message, entries: [] });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: "No matching entries found in the knowledge base.",
      entries: [],
    });
  }

  const entries = data.map((entry) => ({
    category: entry.category,
    question: entry.question,
    answer: entry.answer,
    ai_solvability: entry.ai_solvability,
    routing_contact: entry.routing_contact,
    routing_channel: entry.routing_channel,
    routing_department: entry.routing_department,
  }));

  return JSON.stringify({ entries });
}
