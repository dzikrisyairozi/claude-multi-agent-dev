"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, Loader2, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";
import { useFolderContentsQuery } from "@/hooks/files/useFolderContentsQuery";
import { FileTypeIcon } from "./FileTypeIcon";

export type MoveItemInfo = {
  id: string;
  type: "folder" | "file";
  name: string;
};

type MoveFolderDialogProps = {
  isOpen: boolean;
  itemsToMove: MoveItemInfo[];
  currentFolderId: string | null;
  excludeFolderIds?: Set<string>;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => void;
  isLoading?: boolean;
};

export function MoveFolderDialog({
  isOpen,
  itemsToMove,
  currentFolderId,
  excludeFolderIds,
  onClose,
  onConfirm,
  isLoading = false,
}: MoveFolderDialogProps) {
  const { t } = useLanguage();

  // Browse state - starts at root when dialog opens
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null);
  // Selection state - which folder is selected (single click)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Fetch contents of currently browsed folder
  const { folders, isLoading: isFetchingFolders } = useFolderContentsQuery(browseFolderId);

  // Reset browse location and selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setBrowseFolderId(null);
      setSelectedFolderId(null);
    }
  }, [isOpen]);

  // Reset selection when browse location changes
  useEffect(() => {
    setSelectedFolderId(null);
  }, [browseFolderId]);

  // Get IDs of folders being moved (can't move folder into itself or its descendants)
  const movingFolderIds = new Set(
    itemsToMove.filter((item) => item.type === "folder").map((item) => item.id)
  );

  // Filter out folders being moved AND excluded folders (selected in UI) from destination list
  const filteredFolders = folders.filter(
    (f) => !movingFolderIds.has(f.id) && !excludeFolderIds?.has(f.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If a folder is selected, move there. Otherwise move to current browse location.
    onConfirm(selectedFolderId ?? browseFolderId);
  };

  const handleClose = () => {
    setBrowseFolderId(null);
    setSelectedFolderId(null);
    onClose();
  };

  // Navigate into a folder
  const handleEnterFolder = (folderId: string) => {
    setBrowseFolderId(folderId);
  };

  if (!isOpen || itemsToMove.length === 0) return null;

  // Determine title text
  const isSingleItem = itemsToMove.length === 1;
  const titleText = isSingleItem
    ? itemsToMove[0].type === "folder"
      ? t("folder.move.title")
      : t("move.file.title")
    : t("move.items.title");

  const subtitleText = isSingleItem
    ? t("folder.move.moving", { name: itemsToMove[0].name })
    : t("move.items.moving", { count: itemsToMove.length });

  // Check if trying to move to current location (same as source)
  const targetFolderId = selectedFolderId ?? browseFolderId;
  const isCurrentLocation = targetFolderId === currentFolderId;

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
          <div>
            <h2 className="text-[20px] font-bold text-figma-black">
              {titleText}
            </h2>
            <p className="text-[15px] text-figma-light">
              {subtitleText}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2 mb-6">
            {/* Section Label */}
            <label className="block text-[15px] font-semibold text-figma-light">
              {t("folder.move.sectionLabel")}
            </label>
            <div className="rounded-[8px] max-h-60 overflow-y-auto min-h-[120px] border border-figma-border">
              {isFetchingFolders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-figma-light" />
                </div>
              ) : (
                <>
                  {/* My Files (Root) option - show when at root and item is not already at root */}
                  {browseFolderId === null && currentFolderId !== null && (
                    <div
                      onClick={() => setSelectedFolderId(null)}
                      className={cn(
                        "flex items-center transition-colors cursor-pointer",
                        selectedFolderId === null
                          ? "bg-figma-secondary"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex-1 px-3 py-2 text-left text-sm flex items-center gap-2">
                        <Home className="h-4 w-4 text-figma-light" />
                        <span className="text-figma-black">
                          {t("folder.move.root")}
                        </span>
                      </div>
                    </div>
                  )}
                  {filteredFolders.length > 0 ? (
                    filteredFolders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        onDoubleClick={() => handleEnterFolder(folder.id)}
                        className={cn(
                          "flex items-center transition-colors cursor-pointer",
                          selectedFolderId === folder.id
                            ? "bg-figma-secondary"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex-1 px-3 py-2 text-left text-sm flex items-center gap-2">
                          <FileTypeIcon isFolder size={24} />
                          <span className="truncate text-figma-black">
                            {folder.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnterFolder(folder.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-md mr-1"
                        >
                          <ChevronRight className="h-4 w-4 text-figma-light" />
                        </button>
                      </div>
                    ))
                  ) : (
                    // Only show "no folders" if there's no root option either
                    browseFolderId !== null || currentFolderId === null ? (
                      <p className="px-3 py-8 text-sm text-center text-figma-light">
                        {t("folder.move.noFolders")}
                      </p>
                    ) : null
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-[45px] rounded-[8px] text-[15px] font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50 border border-figma-border text-figma-black bg-transparent"
            >
              {t("folder.move.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading || isCurrentLocation}
              className="flex-1 h-[45px] rounded-[8px] text-[15px] font-semibold transition-colors hover:opacity-90 disabled:opacity-50 bg-figma-primary text-figma-white"
            >
              {isLoading ? t("folder.move.submitting") : t("folder.move.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
