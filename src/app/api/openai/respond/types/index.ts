/**
 * Type definitions for OpenAI API responses and streaming
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { IFileMetadata } from "@/types/file";

/**
 * OpenAI tool call structure
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI message with optional tool calls
 */
export interface AIMessage {
  role: "assistant" | "user" | "system" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Choice from OpenAI completion response
 */
export interface CompletionChoice {
  index: number;
  message: AIMessage;
  finish_reason: string | null;
}

/**
 * OpenAI completion response (non-streaming)
 */
export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Custom progress event sent via SSE
 */
export interface ProgressEvent {
  type: "progress";
  message: string;
}

/**
 * Custom tool metadata event sent via SSE
 */
export interface ToolMetadataEvent {
  type: "tool_metadata";
  approval_request_id?: string;
  approval_request_ids?: string[];
  files?: IFileMetadata[];
  rag_sources?: IFileMetadata[];
  ringi_proposal?: Record<string, unknown>;
}

/**
 * Stream controller helper type
 */
export interface StreamController {
  enqueue(chunk: Uint8Array): void;
  close(): void;
  error(error: unknown): void;
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  supabase: SupabaseClient;
  user: { id: string };
}
