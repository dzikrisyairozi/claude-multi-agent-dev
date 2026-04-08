export type AIJudgment = {
  document_type: string;
  summary: string;
  purpose: string;
  key_entities: {
    people: string[];
    organizations: string[];
    amounts: string[];
    dates: string[];
  };
  tags: string[];
  language: string;
  confidence: number;
};

export type DocumentRecord = {
  id: string;
  user_id: string;
  folder_id: string | null;
  file_name: string;
  file_path: string;
  text_content: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_hash: string | null;
  created_at: string;
  category?: string | null;
  content_hash?: string | null;
  ai_judgment?: AIJudgment | null;
  duplicate?: boolean;
};

export type FileUploadResult = {
  status: "success" | "failed";
  document?: DocumentRecord;
  fileName: string;
  error?: string;
  uploadMs?: number;
};

export type UploadResponsePartial = {
  results: FileUploadResult[];
  successCount: number;
  failureCount: number;
};

// FE-friendly document metadata (camelCase for frontend consumption)
export type DocumentMetadata = {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  fileUrl: string;
  modifiedTime: string;
  category: string | null;
  folderId: string | null;
};

// RAG search result with enriched file data
export type DocumentSearchResult = {
  documentId: string;
  similarity: number | null;
  content: string;
  file: DocumentMetadata | null;
};

// Folder metadata for AI tools (camelCase)
export type FolderMetadata = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
};
