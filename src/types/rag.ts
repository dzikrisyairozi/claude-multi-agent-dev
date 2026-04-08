export type IngestionResult =
  | { documentId: string; status: "processed"; chunks: number }
  | { documentId: string; status: "skipped" | "failed"; reason: string };

export type ExtractionResult = {
  text: string;
};
