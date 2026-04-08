"use client";

import Image from "next/image";
import { getFileIconPath, FOLDER_ICON_PATH } from "@/lib/fileIcons";
import { cn } from "@/lib/utils";

type FileTypeIconProps = {
  mimeType?: string | null;
  isFolder?: boolean;
  size?: number;
  className?: string;
};

/**
 * Renders the appropriate file type icon based on MIME type or folder flag
 * SVG icons already include colored backgrounds and type badges
 */
export function FileTypeIcon({
  mimeType,
  isFolder = false,
  size = 40,
  className,
}: FileTypeIconProps) {
  const iconPath = isFolder ? FOLDER_ICON_PATH : getFileIconPath(mimeType);

  return (
    <Image
      src={iconPath}
      alt={isFolder ? "Folder" : "File"}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}
