"use client";

import {
  FileText,
  Image,
  FileSpreadsheet,
  FileCode,
  File,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { getPresignedUrl } from "@/service/s3/s3Presign";
import { IFileMetadata } from "@/types/file";

interface ApprovalRequestFileCardProps {
  file: IFileMetadata;
}

const getFileIcon = (type?: string) => {
  if (!type) return File;
  if (type.startsWith("image/")) return Image;
  if (type.includes("spreadsheet") || type.includes("excel"))
    return FileSpreadsheet;
  if (type.includes("presentation")) return FileCode;
  if (type.includes("document") || type.includes("pdf")) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export const ApprovalRequestFileCard = ({
  file,
}: ApprovalRequestFileCardProps) => {
  const Icon = getFileIcon(file?.mimeType);

  // TanStack mutation for generating presigned URL
  const mutation = useMutation({
    mutationFn: getPresignedUrl,
    onSuccess: (data: any) => {
      window.open(data?.url, "_blank");
    },
    onError: () => {
      toast.error("Failed to generate download link");
    },
  });

  const handleCardClick = () => {
    if (mutation.isPending) return;
    const cleanedPath =
      file?.fileUrl?.replace(/^uploads\//, "") ?? file?.fileUrl;
    if (!cleanedPath) return;
    mutation.mutate({ file_name: cleanedPath });
  };

  return (
    <div
      onClick={handleCardClick}
      className="group flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-transparent hover:bg-slate-100 hover:border-slate-200 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {/* File Icon */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          {/* Using a hardcoded color/style for PDF look as displayed in similar UIs, usually generic icon is fine but user asked to match image. If image has PDF icons, sticking to red accent is good. */}
          <FileText className="w-5 h-5 text-red-500" />
        </div>

        {/* File Info */}
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 line-clamp-1 break-all">
            {file.name}
          </span>
          <span className="text-xs text-slate-500">
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-slate-500 hover:text-slate-900"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
