export interface IFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface IFileResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  owner: string;
  createdTime: string;
  modifiedTime: string;
}

export interface IUploadParams {
  files: File[];
}

export interface IGetFileUrlRequest {
  file_name: string;
}

export interface IFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  modifiedTime: string;
  category?: string | null;
  folderId?: string;
  documentType?: string | null;
  aiJudgmentSummary?: string | null;
  extractedText?: string | null;
}

// Pending file upload state for chat input area
export type PendingFileStatus = "uploading" | "uploaded" | "error";

export type PendingFile = {
  id: string;
  file: File;
  status: PendingFileStatus;
  document?: import("@/types/document").DocumentRecord;
  error?: string;
};

// Extracted metadata from AI tool responses
export type ExtractedToolMetadata = {
  approval_request_id?: string;
  approval_request_ids?: string[];
  folder_id?: string;
  files?: IFileMetadata[];
  rag_sources?: IFileMetadata[]; // documents used as sources when answering via RAG
  ringi_proposal?: Record<string, unknown>; // AI-proposed draft data (no DB insert)
  filtered_document_ids?: string[]; // LLM-filtered relevant document IDs
};
