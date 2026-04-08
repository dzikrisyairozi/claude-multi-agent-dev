import { axiosNextServer } from "../apiClient";
import { DocumentRecord } from "@/types/document";

type IngestDocumentsRequest = {
  documentIds: string[];
  accessToken: string;
};

export type IngestDocumentsResponse = {
  results: Array<{
    documentId: string;
    status: "processed" | "skipped" | "failed";
    reason?: string;
    chunks?: number;
  }>;
  summary: {
    processed: number;
    skipped: number;
    failed: number;
  };
};

export async function ingestDocuments({
  documentIds,
  accessToken,
}: IngestDocumentsRequest): Promise<IngestDocumentsResponse> {
  if (!documentIds.length) {
    throw new Error("No documents provided for ingestion");
  }

  if (!accessToken) {
    throw new Error("Access token missing");
  }

  try {
    const response = await axiosNextServer.post<IngestDocumentsResponse>(
      "/rag/ingest",
      { documentIds },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || "Failed to ingest files");
  }
}

export const ingestUploadedDocuments = async (
  documents: DocumentRecord[],
  accessToken: string
) => {
  const ids = documents.map((doc) => doc.id);
  return ingestDocuments({ documentIds: ids, accessToken });
};
