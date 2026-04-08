export type OpenAIChatMessageRole = "system" | "user" | "assistant" | "tool";

export type MessageFileRef = {
  name: string;
  fileUrl: string; // S3 file path (will be presigned on the backend)
  mimeType?: string;
};

export type OpenAIChatMessage = {
  role: OpenAIChatMessageRole;
  content: string;
  files?: MessageFileRef[]; // Files attached to this message (for input_file)
};

export type OpenAIChatRequest = {
  threadId?: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  language?: "en" | "ja";
};

export type OpenAIUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type AssistantResponse = {
  message: OpenAIChatMessage;
  usage?: OpenAIUsage;
};
