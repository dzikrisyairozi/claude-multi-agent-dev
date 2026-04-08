"use client";

import { X, Loader2 } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

type DeleteConfirmDialogProps = {
  isOpen: boolean;
  itemName: string;
  itemType: "folder" | "file";
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

export function DeleteConfirmDialog({
  isOpen,
  itemName,
  itemType,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isLoading ? undefined : onClose}
      />
      <div className="relative border shadow-lg w-full max-w-[493px] rounded-[12px] p-[30px] bg-figma-white">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 hover:opacity-70 transition-opacity disabled:opacity-50 text-figma-light"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-[20px] font-bold mb-4 text-figma-black">
          {t(itemType === "folder" ? "delete.folder.title" : "delete.file.title")}
        </h2>

        <p className="text-[15px] mb-1 text-figma-black">
          {t("delete.body", { name: "" })}
          <span className="font-semibold">{itemName}</span>
        </p>

        <p className="text-[13px] mb-6 text-figma-light">
          {t("delete.warning")}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-[45px] rounded-xl text-[15px] font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50 border border-figma-border text-figma-black bg-transparent"
          >
            {t("delete.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 h-[45px] rounded-xl text-[15px] font-semibold transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center bg-figma-error text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("delete.submitting")}
              </>
            ) : (
              t("delete.submit")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
