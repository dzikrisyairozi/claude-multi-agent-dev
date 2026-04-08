"use client";

import { OpenAIChatRequest } from "@/types/openai";

export const streamMgappResponse = async (
  payload: OpenAIChatRequest,
  options?: { accessToken?: string; signal?: AbortSignal }
): Promise<ReadableStream<Uint8Array>> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch("/api/mgapp/respond", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "");
    let message = "Unable to reach AI assistant";

    if (errorText) {
      try {
        const parsed = JSON.parse(errorText);
        message = parsed?.error || message;
      } catch {
        message = errorText;
      }
    }

    throw new Error(message);
  }

  return response.body;
};
