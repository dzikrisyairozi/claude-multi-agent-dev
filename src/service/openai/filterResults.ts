import OpenAI from "openai";
import { AI_CONFIG } from "@/app/api/openai/respond/config/ai.config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  timeout: 10000,
});

interface FilterInput {
  documentId: string;
  fileName: string;
  mimeType: string | null;
  contentPreview: string;
}

/**
 * Filter search results by relevance using LLM intent understanding.
 * Returns IDs of relevant documents only (irrelevant ones are removed).
 */
export async function filterResultsWithLLM(
  query: string,
  results: FilterInput[]
): Promise<string[]> {
  if (results.length <= 1) return results.map((r) => r.documentId);

  const resultsList = results
    .map(
      (r, i) =>
        `${i + 1}. [${r.mimeType || "unknown"}] ${r.fileName}: ${r.contentPreview.slice(0, 150)}`
    )
    .join("\n");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (openai.responses as any).create({
    model: AI_CONFIG.MODEL,
    reasoning: { effort: "low" },
    input: [
      {
        role: "user",
        content: `User searched: "${query}"\n\nSearch results:\n${resultsList}\n\nFor each result, is it relevant to what the user is looking for? Reply with ONLY the numbers of relevant results, comma-separated. Example: 1,3\nIf all are relevant, reply: ${results.map((_, i) => i + 1).join(",")}`,
      },
    ],
    max_output_tokens: 50,
  });

  const text = (response.output_text ?? "").trim();
  console.log(`[Filter] query="${query}" | response="${text}"`);

  const indices = text
    .split(",")
    .map((s: string) => parseInt(s.trim(), 10) - 1)
    .filter((i: number) => !isNaN(i) && i >= 0 && i < results.length);

  // Deduplicate
  const seen = new Set<number>();
  const relevant: string[] = [];
  for (const idx of indices) {
    if (!seen.has(idx)) {
      seen.add(idx);
      relevant.push(results[idx].documentId);
    }
  }

  // If LLM returned nothing valid, keep all (don't filter everything out)
  if (relevant.length === 0) return results.map((r) => r.documentId);

  return relevant;
}
