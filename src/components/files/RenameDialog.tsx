"use client";

import { useState, useEffect } from "react";
import { Pencil, X } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

type RenameDialogProps = {
  isOpen: boolean;
  currentName: string;
  itemType: "folder" | "file";
  onClose: () => void;
  onConfirm: (newName: string) => void;
  isLoading?: boolean;
};

export function RenameDialog({
  isOpen,
  currentName,
  itemType,
  onClose,
  onConfirm,
  isLoading = false,
}: RenameDialogProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentName) {
      onConfirm(name.trim());
    }
  };

  const handleClose = () => {
    setName(currentName);
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
          <div className="flex items-center justify-center w-[40px] h-[40px] rounded-[6px] bg-figma-secondary">
            <Pencil className="h-5 w-5 text-figma-primary" />
          </div>
          <h2 className="text-[20px] font-bold text-figma-black">
            {t("rename.title", { type: itemType === "folder" ? t("folder.type") : t("file.type") })}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2 mb-6">
            <label
              htmlFor="rename-input"
              className="block text-[15px] font-semibold text-figma-light"
            >
              {t("rename.label")}
            </label>
            <input
              id="rename-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("rename.placeholder")}
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
              {t("rename.cancel")}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || name.trim() === currentName || isLoading}
              className="flex-1 h-[45px] rounded-[8px] text-[15px] font-semibold transition-colors hover:opacity-90 disabled:opacity-50 bg-figma-primary text-figma-white"
            >
              {isLoading ? t("rename.submitting") : t("rename.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
