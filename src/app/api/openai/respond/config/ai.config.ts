/**
 * AI Configuration
 * Centralized configuration for OpenAI and AI-related settings
 */

export const AI_CONFIG = {
  /** OpenAI model for chat completions */
  MODEL: process.env.OPENAI_MODEL || "gpt-5.4-nano",

  /** Maximum tool execution rounds before forcing a response */
  MAX_TOOL_ROUNDS: 5,

  /** Maximum tokens for completion responses */
  MAX_TOKENS: 2028,

  /** Reasoning effort ("low" | "medium" | "high") */
  REASONING_EFFORT: "low" as const,

  /** Text verbosity ("low" | "medium" | "high") */
  VERBOSITY: "low" as const,

  /** Embedding configuration */
  EMBEDDING: {
    /** Output vector dimensions — must match DB column vector(1536) */
    DIMENSIONALITY: 1536,
    /** Similarity threshold for semantic search (0-1) */
    SIMILARITY_THRESHOLD: 0.25,
    /** Max similarity gap from top result for rag_sources display */
    RAG_SOURCES_SIMILARITY_GAP: 0.10,
  },

  /** Text chunking for document ingestion */
  CHUNKING: {
    CHUNK_SIZE: 800,
    OVERLAP: 200,
  },

  /** Ingestion pipeline (file content extraction) */
  INGESTION: {
    VISION_MODEL: process.env.OPENAI_INGESTION_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-nano",
    VISION_MAX_TOKENS: 4096,
  },
} as const;
