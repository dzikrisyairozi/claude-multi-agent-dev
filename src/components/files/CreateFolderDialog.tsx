"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { FileTypeIcon } from "./FileTypeIcon";

type CreateFolderDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  isLoading?: boolean;
};

export function CreateFolderDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: CreateFolderDialogProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
      setName("");
    }
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div className="relative border shadow-lg w-full max-w-[493px] rounded-[12px] p-[30px] bg-figma-white">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 hover:opacity-70 transition-opacity text-figma-light"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-[10px] mb-6">
          <FileTypeIcon isFolder size={40} />
          <h2 className="text-[20px] font-bold text-figma-black">
            {t("folder.create.title")}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2 mb-6">
            <label
              htmlFor="folder-name"
              className="block text-[15px] font-semibold text-figma-light"
            >
              {t("folder.create.label")}
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("folder.create.placeholder")}
              autoFocus
              disabled={isLoading}
              className="w-full h-[45px] rounded-[8px] text-[12px] px-[14px] outline-none focus:ring-2 focus:ring-[#3abdf7] disabled:opacity-50 border border-figma-border text-figma-black bg-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-[45px] rounded-[8px] text-[15px] font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50 border border-figma-border text-figma-black bg-transparent"
            >
              {t("folder.create.cancel")}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="flex-1 h-[45px] rounded-[8px] text-[15px] font-semibold transition-colors hover:opacity-90 disabled:opacity-50 bg-figma-primary text-figma-white"
            >
              {isLoading ? t("folder.create.submitting") : t("folder.create.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
