"use client";

import { ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPresignedUrl } from "@/service/s3/s3Presign";
import { IFileMetadata } from "@/types/file";
import { ImagePreview } from "./ImagePreview";
import { formatFileSize } from "@/lib/fileIcons";

interface InlineFileReferencesProps {
  files: IFileMetadata[];
  deletedFileIds?: Set<string>;
}

function FileLink({ file }: { file: IFileMetadata }) {
  const mutation = useMutation({
    mutationFn: getPresignedUrl,
    onSuccess: (data: { url: string }) => {
      window.open(data.url, "_blank");
    },
    onError: () => {
      toast.error("Failed to generate download link");
    },
  });

  const handleClick = () => {
    if (mutation.isPending) return;
    const cleanedPath = file.fileUrl?.replace(/^uploads\//, "") ?? file.fileUrl;
    if (!cleanedPath) return;
    mutation.mutate({ file_name: cleanedPath });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-2 cursor-pointer disabled:cursor-wait"
    >
      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate max-w-[200px]">{file.name}</span>
      <span className="text-xs text-muted-foreground shrink-0">
        ({formatFileSize(file.size)})
      </span>
      {mutation.isPending && (
        <span className="text-xs text-muted-foreground">Loading...</span>
      )}
    </button>
  );
}

/**
 * Renders clickable file links and inline image previews
 * for files referenced in assistant messages.
 */
export function InlineFileReferences({ files, deletedFileIds }: InlineFileReferencesProps) {
  const activeFiles = files.filter((f) => !f?.id || !deletedFileIds?.has(f.id));
  const imageFiles = activeFiles.filter((f) => f.mimeType?.startsWith("image/") && f.fileUrl);

  if (activeFiles.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Clickable file links */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {activeFiles.map((file, i) => (
          <FileLink key={`${file.id}-${i}`} file={file} />
        ))}
      </div>

      {/* Inline image previews */}
      {imageFiles.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {imageFiles.map((file, i) => (
            <ImagePreview
              key={`img-${file.id}-${i}`}
              fileUrl={file.fileUrl}
              fileName={file.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
