"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { usePresignedUrl } from "@/hooks/chat/usePresignedUrl";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  fileUrl: string;
  fileName: string;
  className?: string;
}

export function ImagePreview({ fileUrl, fileName, className }: ImagePreviewProps) {
  const { url, isLoading, error } = usePresignedUrl(fileUrl);
  const [imgError, setImgError] = useState(false);

  if (error || imgError) return null;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted/40 border",
          "w-full max-w-xs h-40",
          className,
        )}
      >
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("block rounded-lg overflow-hidden border hover:shadow-md transition-shadow", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={fileName}
        onError={() => setImgError(true)}
        className="max-w-xs max-h-60 object-contain bg-muted/20"
        loading="lazy"
      />
    </a>
  );
}
