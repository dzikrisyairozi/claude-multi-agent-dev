"use client";

import { useState } from "react";
import {
  FileText,
  Share2,
  Trash2,
  Eye,
  EyeOff,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  Check,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getPresignedUrl } from "@/service/s3/s3Presign";
import { IFileMetadata } from "@/types/file";
import { getIconBgColor, getIconColor, formatFileSize, getBadgeText } from "@/lib/fileIcons";
import { ImagePreview } from "@/components/chat/ImagePreview";

interface UploadedFileCardProps {
  file: IFileMetadata;
  onDelete?: (fileId: string) => void;
  isDeleted?: boolean;
  isFailed?: boolean;
}

function FileIcon({ type, className }: { type?: string; className?: string }) {
  if (!type) return <File className={className} />;
  if (type.startsWith("image/")) return <ImageIcon className={className} />;
  if (type.includes("spreadsheet") || type.includes("excel"))
    return <FileSpreadsheet className={className} />;
  if (type.includes("presentation")) return <FileCode className={className} />;
  if (type.includes("document") || type.includes("pdf")) return <FileText className={className} />;
  return <File className={className} />;
}

export const UploadedFileCard = ({ file, onDelete, isDeleted = false, isFailed = false }: UploadedFileCardProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const iconBgColor = getIconBgColor(file?.mimeType);
  const iconColor = getIconColor(file?.mimeType);
  const isImage = file.mimeType?.startsWith("image/");

  const mutation = useMutation({
    mutationFn: getPresignedUrl,
    onSuccess: (data: { url: string }) => {
      window.open(data?.url, "_blank");
    },
    onError: () => {
      toast.error("Failed to generate download link");
    },
  });

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mutation.isPending || isDeleted) return;
    const cleanedPath =
      file?.fileUrl?.replace(/^uploads\//, "") ?? file?.fileUrl;
    if (!cleanedPath) return;
    mutation.mutate({ file_name: cleanedPath });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleted) return;
    try {
      await navigator.clipboard.writeText(file.fileUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(file.id);
    }
  };

  if (isFailed) {
    return (
      <div className="flex items-center gap-3 p-3 border border-red-200 rounded-lg bg-red-50/50 opacity-70">
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-lg ${iconBgColor} flex items-center justify-center opacity-50`}>
            <FileIcon type={file?.mimeType} className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[6px] font-semibold px-1 rounded-sm">
            {getBadgeText(file.mimeType)}
          </div>
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium text-muted-foreground truncate">
            {file.name}
          </span>
          <span className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
            <XCircle className="w-3 h-3" />
            Upload failed
          </span>
        </div>

        <div className="shrink-0">
          <XCircle className="w-4 h-4 text-red-500" />
        </div>
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className="flex items-center gap-3 p-3 border border-red-200 rounded-lg bg-red-50/50 opacity-70">
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-lg ${iconBgColor} flex items-center justify-center opacity-50`}>
            <FileIcon type={file?.mimeType} className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[6px] font-semibold px-1 rounded-sm">
            {getBadgeText(file.mimeType)}
          </div>
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium text-muted-foreground line-through truncate">
            {file.name}
          </span>
          <span className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
            <AlertTriangle className="w-3 h-3" />
            File deleted — no longer available for chat
          </span>
        </div>

        <span className="text-xs text-muted-foreground shrink-0">
          {formatFileSize(file.size)}
        </span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={handleOpen}
      >
        {/* File Icon with type badge */}
        <div className="relative shrink-0">
          <div
            className={`w-10 h-10 rounded-lg ${iconBgColor} flex items-center justify-center`}
          >
            <FileIcon type={file?.mimeType} className={`w-5 h-5 ${iconColor}`} />
          </div>
          {/* Type badge on icon */}
          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[6px] font-semibold px-1 rounded-sm">
            {getBadgeText(file.mimeType)}
          </div>
        </div>

        {/* Filename - clickable link */}
        <button
          type="button"
          onClick={handleOpen}
          disabled={mutation.isPending}
          className="text-sm font-medium text-primary hover:underline underline-offset-2 truncate flex-1 min-w-0 text-left cursor-pointer disabled:cursor-wait"
        >
          {file.name}
          {mutation.isPending && (
            <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
          )}
        </button>

        {/* File size */}
        <span className="text-xs text-muted-foreground shrink-0">
          {formatFileSize(file.size)}
        </span>

        {/* Green checkmark - upload success */}
        <div className="shrink-0">
          <Check className="w-4 h-4 text-green-500" />
        </div>

        {/* Preview toggle button - icon only, for images */}
        {isImage && (
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setShowPreview((prev) => !prev);
            }}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        )}

        {/* Share button - icon only */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleShare}
          disabled={mutation.isPending}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
        >
          <Share2 className="w-4 h-4" />
        </Button>

        {/* Delete button - icon only, red color */}
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            disabled={mutation.isPending}
            className="h-8 w-8 shrink-0 text-red-400 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Image preview (toggled by Preview button) */}
      {isImage && showPreview && file.fileUrl && (
        <div className="px-3 pb-3">
          <ImagePreview fileUrl={file.fileUrl} fileName={file.name} />
        </div>
      )}
    </div>
  );
};
