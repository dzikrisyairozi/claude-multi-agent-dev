"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/providers/LanguageProvider";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const FileUploadZone = ({
  onFilesSelected,
  disabled,
}: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const validateFiles = useCallback(
    (files: File[]) => {
      const maxSize = 20 * 1024 * 1024; // 20MB
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
        "application/vnd.google-apps.document", // Google Docs
        "application/msword", // Legacy DOC
        "text/csv",
        "text/plain",
        "text/markdown",
        "image/jpeg",
        "image/png",
        "image/heic",
      ];

      const invalidFiles = files.filter(
        (file) => file.size > maxSize || !allowedTypes.includes(file.type)
      );

      if (invalidFiles.length > 0) {
        toast.error(t("upload.invalidFiles.title"), {
          description: t("upload.invalidFiles.description", {
            count: invalidFiles.length,
          }),
        });
        return false;
      }

      if (files.length > 10) {
        toast.error(t("upload.tooMany.title"), {
          description: t("upload.tooMany.description"),
        });
        return false;
      }

      return true;
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (validateFiles(files)) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected, validateFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !e.target.files) return;

      const files = Array.from(e.target.files);
      if (validateFiles(files)) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected, validateFiles]
  );

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-xl transition-all duration-300 mb-5 shrink-0",
        "min-h-[140px] flex flex-col items-center justify-center p-4 sm:p-6",
        "hover:border-primary bg-white hover:bg-primary/5",
        isDragging && "border-primary bg-primary/10 scale-[1.02]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        accept=".pdf,.doc,.docx,.xlsx,.pptx,.csv,.txt,.md,.jpg,.jpeg,.png,.heic,.gdoc"
      />

      <div className="pointer-events-none flex flex-col items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "p-3 rounded-full bg-linear-to-br transition-transform duration-300",
            isDragging
              ? "from-primary to-primary-glow scale-110"
              : "from-muted to-muted"
          )}
        >
          <Upload
            className={cn(
              "w-6 h-6 transition-colors",
              isDragging ? "text-primary-foreground" : "text-muted-foreground"
            )}
          />
        </div>

        <div className="text-center space-y-1 sm:space-y-1.5">
          <p className="text-base sm:text-lg font-medium">
            {isDragging ? t("upload.dropActive") : t("upload.dropIdle")}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("upload.subtitle")}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {t("upload.supported")}
          </p>
        </div>
      </div>
    </div>
  );
};
