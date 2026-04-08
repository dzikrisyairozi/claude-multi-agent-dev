/**
 * File icon utilities for mapping MIME types to icons and human-readable formats
 */

export type FileIconType = "folder" | "pdf" | "doc" | "xls" | "ppt" | "image" | "zip" | "default";

/**
 * Get the icon path based on MIME type
 */
export function getFileIconPath(mimeType: string | null | undefined): string {
  if (!mimeType) return "/images/icons/doc.svg"; // default

  const type = mimeType.toLowerCase();

  // PDF
  if (type === "application/pdf") {
    return "/images/icons/pdf.svg";
  }

  // Word documents
  if (
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "application/vnd.oasis.opendocument.text"
  ) {
    return "/images/icons/doc.svg";
  }

  // Excel spreadsheets
  if (
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    type === "application/vnd.oasis.opendocument.spreadsheet" ||
    type === "text/csv"
  ) {
    return "/images/icons/xls.svg";
  }

  // Images
  if (type.startsWith("image/")) {
    return "/images/icons/image.svg";
  }

  // Default document icon
  return "/images/icons/doc.svg";
}

/**
 * Get the icon type based on MIME type
 */
export function getFileIconType(mimeType: string | null | undefined): FileIconType {
  if (!mimeType) return "default";

  const type = mimeType.toLowerCase();

  if (type === "application/pdf") return "pdf";

  if (
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "application/vnd.oasis.opendocument.text"
  ) {
    return "doc";
  }

  if (
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    type === "application/vnd.oasis.opendocument.spreadsheet" ||
    type === "text/csv"
  ) {
    return "xls";
  }

  if (
    type === "application/vnd.ms-powerpoint" ||
    type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    type === "application/vnd.oasis.opendocument.presentation"
  ) {
    return "ppt";
  }

  if (
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    type === "application/x-rar-compressed" ||
    type === "application/x-7z-compressed"
  ) {
    return "zip";
  }

  if (type.startsWith("image/")) return "image";

  return "default";
}

/**
 * Get human-readable file format name based on MIME type
 */
export function getFileFormatName(mimeType: string | null | undefined): string {
  if (!mimeType) return "File";

  const type = mimeType.toLowerCase();

  // PDF
  if (type === "application/pdf") return "PDF";

  // Word documents
  if (type === "application/msword") return "Microsoft Word Document";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "Microsoft Word Document";
  }
  if (type === "application/vnd.oasis.opendocument.text") return "OpenDocument Text";

  // Excel spreadsheets
  if (type === "application/vnd.ms-excel") return "Microsoft Excel Worksheet";
  if (type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return "Microsoft Excel Worksheet";
  }
  if (type === "application/vnd.oasis.opendocument.spreadsheet") return "OpenDocument Spreadsheet";
  if (type === "text/csv") return "CSV File";

  // Images
  if (type === "image/jpeg" || type === "image/jpg") return "JPEG Image";
  if (type === "image/png") return "PNG file";
  if (type === "image/gif") return "GIF Image";
  if (type === "image/webp") return "WebP Image";
  if (type === "image/svg+xml") return "SVG Image";
  if (type.startsWith("image/")) return "Image";

  // Text files
  if (type === "text/plain") return "Text File";
  if (type === "text/html") return "HTML File";
  if (type === "text/css") return "CSS File";
  if (type === "text/javascript" || type === "application/javascript") return "JavaScript File";
  if (type === "application/json") return "JSON File";
  if (type === "application/xml" || type === "text/xml") return "XML File";

  // Archives
  if (type === "application/zip") return "ZIP Archive";
  if (type === "application/x-rar-compressed") return "RAR Archive";
  if (type === "application/x-7z-compressed") return "7-Zip Archive";

  // Other common types
  if (type === "application/octet-stream") return "Binary File";

  // Fallback: use the subtype
  const parts = type.split("/");
  if (parts.length === 2) {
    return parts[1].toUpperCase() + " File";
  }

  return "File";
}

/**
 * Folder icon path constant
 */
export const FOLDER_ICON_PATH = "/images/icons/folder.svg";

/**
 * Get icon background color class based on MIME type
 */
export function getIconBgColor(type?: string): string {
  if (!type) return "bg-gray-100";
  if (type.includes("pdf")) return "bg-red-100";
  if (type.startsWith("image/")) return "bg-purple-100";
  if (type.includes("spreadsheet") || type.includes("excel")) return "bg-green-100";
  if (type.includes("presentation")) return "bg-orange-100";
  if (type.includes("document") || type.includes("word")) return "bg-blue-100";
  return "bg-gray-100";
}

/**
 * Get icon color class based on MIME type
 */
export function getIconColor(type?: string): string {
  if (!type) return "text-gray-500";
  if (type.includes("pdf")) return "text-red-500";
  if (type.startsWith("image/")) return "text-purple-500";
  if (type.includes("spreadsheet") || type.includes("excel")) return "text-green-500";
  if (type.includes("presentation")) return "text-orange-500";
  if (type.includes("document") || type.includes("word")) return "text-blue-500";
  return "text-gray-500";
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * Format date string in human-readable format
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * MIME type to badge text mapping
 */
const MIME_TO_BADGE: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.google-apps.document": "GDOC",
  "application/msword": "DOC",
  "text/csv": "CSV",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/heic": "HEIC",
  "application/zip": "ZIP",
};

/**
 * Get short badge text based on MIME type
 */
export function getBadgeText(mimeType?: string): string {
  if (!mimeType) return "FILE";

  if (MIME_TO_BADGE[mimeType]) return MIME_TO_BADGE[mimeType];

  if (mimeType.includes("google-apps")) {
    if (mimeType.includes("spreadsheet")) return "GSHEET";
    if (mimeType.includes("presentation")) return "GSLIDE";
    if (mimeType.includes("drawing")) return "GDRAW";
    return "GOOGLE";
  }

  const subtype = mimeType.split("/")[1]?.toUpperCase();
  if (!subtype) return "FILE";
  if (subtype.length > 8) return subtype.substring(0, 6) + "...";
  return subtype;
}
