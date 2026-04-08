import { IFileMetadata } from "@/types/file";

export type FileSource = "upload" | "search";

export type ConversationMessageMetadata = {
  approval_request_id?: string;
  approval_request_ids?: string[];
  files?: any[];
  rag_sources?: IFileMetadata[]; // documents used as sources when AI answered via RAG
  source?: FileSource;
  ringi_proposal?: Record<string, any>; // AI-proposed draft data for pre-filling form
  [key: string]: any;
};
export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: IFileMetadata[];
  timestamp?: string;
  metadata?: ConversationMessageMetadata;
};
