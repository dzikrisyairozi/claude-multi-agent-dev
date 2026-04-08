"use client";

import { X, FolderOpen, ExternalLink, Pencil, FolderInput, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/LanguageProvider";

type SelectionToolbarProps = {
  selectedCount: number;
  onClear: () => void;
  onView?: () => void;  // Optional - only shown when single folder selected
  onOpen?: () => void;  // Optional - only shown when single file selected
  onRename?: () => void;  // Optional - only shown when single item selected
  onMove: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
};

export function SelectionToolbar({
  selectedCount,
  onClear,
  onView,
  onOpen,
  onRename,
  onMove,
  onDelete,
  isDeleting = false,
}: SelectionToolbarProps) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-primary/5 border rounded-lg mb-4">
      <button
        onClick={onClear}
        className="p-1 hover:bg-muted rounded-md transition-colors"
        title={t("selection.clear")}
      >
        <X className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium">
        {t("selection.count", { count: selectedCount })}
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            {t("selection.view")}
          </Button>
        )}
        {onOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpen}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t("file.menu.open")}
          </Button>
        )}
        {onRename && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRename}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            {t("selection.rename")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMove}
          className="gap-2"
        >
          <FolderInput className="h-4 w-4" />
          {t("selection.move")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? t("folder.deleting") : t("selection.delete")}
        </Button>
      </div>
    </div>
  );
}
