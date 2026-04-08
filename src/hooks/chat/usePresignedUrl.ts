"use client";

import { useEffect, useRef, useReducer } from "react";
import { getPresignedUrl } from "@/service/s3/s3Presign";

// Simple in-memory cache shared across all hook instances
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes (presigned URLs expire in 5)

function cleanPath(fileUrl: string): string {
  return fileUrl.replace(/^uploads\//, "");
}

type State = { url: string | null; isLoading: boolean; error: string | null };
type Action =
  | { type: "loading" }
  | { type: "success"; url: string }
  | { type: "error"; message: string };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { url: null, isLoading: true, error: null };
    case "success":
      return { url: action.url, isLoading: false, error: null };
    case "error":
      return { url: null, isLoading: false, error: action.message };
  }
}

function getInitialState(fileUrl: string | undefined): State {
  if (fileUrl) {
    const cached = urlCache.get(cleanPath(fileUrl));
    if (cached && cached.expiresAt > Date.now()) {
      return { url: cached.url, isLoading: false, error: null };
    }
  }
  return { url: null, isLoading: false, error: null };
}

/**
 * Lazily fetches and caches a presigned URL for a file.
 * Returns { url, isLoading, error }.
 */
export function usePresignedUrl(fileUrl: string | undefined, enabled = true) {
  const [state, dispatch] = useReducer(reducer, fileUrl, getInitialState);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!fileUrl || !enabled) return;

    abortRef.current = false;
    const key = cleanPath(fileUrl);

    // Check cache — if hit, dispatch success (reducer dedupes identical url)
    const cached = urlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      dispatch({ type: "success", url: cached.url });
      return;
    }

    dispatch({ type: "loading" });

    getPresignedUrl({ file_name: key })
      .then((data) => {
        if (abortRef.current) return;
        urlCache.set(key, { url: data.url, expiresAt: Date.now() + CACHE_TTL_MS });
        dispatch({ type: "success", url: data.url });
      })
      .catch((err: Error) => {
        if (abortRef.current) return;
        dispatch({ type: "error", message: err?.message || "Failed to load URL" });
      });

    return () => {
      abortRef.current = true;
    };
  }, [fileUrl, enabled]);

  return state;
}
