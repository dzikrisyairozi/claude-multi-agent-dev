"use client";

import { useState } from "react";
import {
  FileText,
  Share2,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPresignedUrl } from "@/service/s3/s3Presign";
import { IFileMetadata } from "@/types/file";
import {
  getIconBgColor,
  getIconColor,
  formatFileSize,
  formatDate,
  getBadgeText,
} from "@/lib/fileIcons";
import { ImagePreview } from "@/components/chat/ImagePreview";

interface FileCardProps {
  file: IFileMetadata;
  onDelete?: (file: IFileMetadata) => void;
  isDeleted?: boolean;
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

/* ------------------ Component ------------------ */
export const FileCard = ({ file, isDeleted = false }: FileCardProps) => {
  const isImage = file.mimeType?.startsWith("image/");
  const [showPreview, setShowPreview] = useState(!!isImage);
  const iconBgColor = getIconBgColor(file?.mimeType);
  const iconColor = getIconColor(file?.mimeType);

  const openMutation = useMutation({
    mutationFn: getPresignedUrl,
    onSuccess: (data: { url: string; key: string }) => {
      window.open(data?.url, "_blank");
    },
    onError: () => {
      toast.error("Failed to open file");
    },
  });

  const shareMutation = useMutation({
    mutationFn: getPresignedUrl,
    onSuccess: async (data: { url: string; key: string }) => {
      try {
        await navigator.clipboard.writeText(data.url);
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Failed to copy link");
      }
    },
    onError: () => {
      toast.error("Failed to generate shareable link");
    },
  });

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (openMutation.isPending || isDeleted) return;
    const cleanedPath = file?.fileUrl?.replace(/^uploads\//, "") ?? file?.fileUrl;
    if (!cleanedPath) return;
    openMutation.mutate({ file_name: cleanedPath });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (shareMutation.isPending || isDeleted) return;
    const cleanedPath = file?.fileUrl?.replace(/^uploads\//, "") ?? file?.fileUrl;
    if (!cleanedPath) return;
    shareMutation.mutate({ file_name: cleanedPath });
  };

  if (isDeleted) {
    return (
      <Card className="p-4 border-red-200 bg-red-50/40 opacity-70">
        {/* Row 1: Icon, Filename, Deleted Badge */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            <div className={`w-6 h-6 rounded ${iconBgColor} flex items-center justify-center opacity-50`}>
              <FileIcon type={file?.mimeType} className={`w-3.5 h-3.5 ${iconColor}`} />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[4px] font-semibold px-1 rounded-sm">
              {getBadgeText(file.mimeType)}
            </div>
          </div>

          <span className="text-sm font-normal text-muted-foreground line-through truncate flex-1">
            {file.name}
          </span>

          <Badge
            variant="outline"
            className="bg-red-50 text-red-500 border-red-200 text-[10px] px-2 py-0.5 shrink-0"
          >
            Deleted
          </Badge>
        </div>

        {/* Deleted notice */}
        <div className="flex items-center gap-1.5 text-xs text-red-500 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>File deleted — no longer available for chat</span>
        </div>

        {/* Row 3: Date and Size */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatDate(file.modifiedTime)}</span>
          <span>{formatFileSize(file.size)}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 hover:shadow-elevated transition-all duration-300">
      {/* Row 1: Icon, Filename, Category Badge */}
      <div className="flex items-center gap-3 mb-3">
        {/* File Icon with type badge */}
        <div className="relative shrink-0">
          <div className={`w-6 h-6 rounded ${iconBgColor} flex items-center justify-center`}>
            <FileIcon type={file?.mimeType} className={`w-3.5 h-3.5 ${iconColor}`} />
          </div>
          {/* Type badge on icon */}
          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[4px] font-semibold px-1 rounded-sm">
            {getBadgeText(file.mimeType)}
          </div>
        </div>

        {/* Filename - clickable link (opens file in new tab) */}
        <button
          type="button"
          onClick={handleOpen}
          disabled={openMutation.isPending}
          className="text-sm font-normal text-primary hover:underline underline-offset-2 truncate flex-1 text-left cursor-pointer disabled:cursor-wait"
        >
          {file.name}
          {openMutation.isPending && (
            <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
          )}
        </button>

        {/* Category Badge */}
        {file.category && (
          <Badge
            variant="outline"
            className="bg-sky-50 text-blue-500 border-sky-200 text-[10px] px-2 py-0.5 shrink-0"
          >
            {file.category}
          </Badge>
        )}
      </div>

      {/* Row 2: Open, Preview, and Share buttons */}
      <div className="flex gap-2 mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpen}
          disabled={openMutation.isPending}
          className="flex-1 h-8 text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          Open
        </Button>
        {isImage && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setShowPreview((prev) => !prev);
            }}
            className="flex-1 h-8 text-xs"
          >
            {showPreview ? (
              <EyeOff className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <Eye className="w-3.5 h-3.5 mr-1.5" />
            )}
            {showPreview ? "Hide" : "Preview"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleShare}
          disabled={shareMutation.isPending}
          className="flex-1 h-8 text-xs"
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          {shareMutation.isPending ? "..." : "Share"}
        </Button>
      </div>

      {/* Image preview (toggled by Preview button) */}
      {isImage && showPreview && file.fileUrl && (
        <div className="mb-3">
          <ImagePreview fileUrl={file.fileUrl} fileName={file.name} />
        </div>
      )}

      {/* Row 3: Date and Size */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDate(file.modifiedTime)}</span>
        <span>{formatFileSize(file.size)}</span>
      </div>
    </Card>
  );
};
