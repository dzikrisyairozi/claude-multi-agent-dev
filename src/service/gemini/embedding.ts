import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "@/app/api/openai/respond/config/ai.config";

const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2-preview";

// Lazily initialized Gemini client
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

// Asymmetric pair: QUERY finds, DOCUMENT gets found
export const TASK_TYPE = {
  RETRIEVAL_QUERY: "RETRIEVAL_QUERY",
  RETRIEVAL_DOCUMENT: "RETRIEVAL_DOCUMENT",
} as const;

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE];

/**
 * Generate a text embedding using Gemini.
 * Used for: query embeddings (search), text-only documents (DOCX, XLSX after extraction).
 */
export async function geminiTextEmbedding(
  text: string,
  taskType: TaskType = TASK_TYPE.RETRIEVAL_QUERY
): Promise<number[]> {
  const ai = getAI();
  const response = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: AI_CONFIG.EMBEDDING.DIMENSIONALITY,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error("Gemini embedding response missing vector data");
  }
  return values;
}

/**
 * Generate a multimodal embedding using Gemini.
 * When text is provided, produces an aggregated embedding (text + file bytes)
 * in a single content entry for richer semantic representation.
 */
export async function geminiMultimodalEmbedding(
  data: Buffer,
  mimeType: string,
  text?: string
): Promise<number[]> {
  const ai = getAI();
  const base64Data = data.toString("base64");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];
  if (text?.trim()) {
    parts.push({ text });
  }
  parts.push({ inlineData: { mimeType, data: base64Data } });

  const response = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: { parts },
    config: {
      taskType: TASK_TYPE.RETRIEVAL_DOCUMENT,
      outputDimensionality: AI_CONFIG.EMBEDDING.DIMENSIONALITY,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error("Gemini multimodal embedding response missing vector data");
  }
  return values;
}

/**
 * Batch text embeddings using Gemini.
 * Used for chunked document embedding.
 */
export async function geminiBatchTextEmbedding(
  texts: string[]
): Promise<number[][]> {
  const ai = getAI();
  const response = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: texts,
    config: {
      taskType: TASK_TYPE.RETRIEVAL_DOCUMENT,
      outputDimensionality: AI_CONFIG.EMBEDDING.DIMENSIONALITY,
    },
  });

  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("Gemini batch embedding returned no results");
  }

  return response.embeddings.map((e) => {
    if (!e.values) throw new Error("Gemini embedding missing values");
    return e.values;
  });
}

/**
 * Check if a mime type supports Gemini multimodal embedding (no text extraction needed).
 */
export function isMultimodalEmbeddable(mimeType: string): boolean {
  const supported = [
    "application/pdf",
    "image/png",
    "image/jpeg",
  ];
  return supported.includes(mimeType.toLowerCase());
}
