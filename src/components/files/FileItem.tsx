"use client";

import { useDraggable } from "@dnd-kit/core";
import { MoreVertical, Trash2, Download, Pencil, FolderInput, ExternalLink } from "lucide-react";
import { DocumentRecord } from "@/types/document";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import moment from "moment";
import { useLanguage } from "@/providers/LanguageProvider";
import { FileTypeIcon } from "./FileTypeIcon";
import { getFileFormatName } from "@/lib/fileIcons";
import { supabase } from "@/integrations/supabase/client";

const formatBytes = (bytes: number | null | undefined) => {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[index]}`;
};

type ViewMode = "list" | "grid";

type FileItemProps = {
  file: DocumentRecord;
  viewMode?: ViewMode;
  onSelect: (fileId: string, event: React.MouseEvent) => void;
  onOpen: (file: DocumentRecord) => void;
  onDownload: (file: DocumentRecord) => void;
  onRename: (file: DocumentRecord) => void;
  onMove: (file: DocumentRecord) => void;
  onDelete: (fileId: string) => void;
  isSelected?: boolean;
  isDeleting?: boolean;
};

export function FileItem({
  file,
  viewMode = "list",
  onSelect,
  onOpen,
  onDownload,
  onRename,
  onMove,
  onDelete,
  isSelected = false,
  isDeleting = false,
}: FileItemProps) {
  const { t, language } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `file-${file.id}`,
    data: { type: "file", item: file },
  });

  // Image preview for grid view
  const isImage = file.mime_type?.startsWith("image/") ?? false;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (!isImage || viewMode !== "grid" || !file.file_path) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;

        const fileName = file.file_path.replace(/^uploads\//, "");
        const res = await fetch("/api/presign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fileName, disposition: "inline" }),
        });

        if (!res.ok || cancelled) { setPreviewError(true); return; }
        const { url } = await res.json();
        if (!cancelled) setPreviewUrl(url);
      } catch {
        if (!cancelled) setPreviewError(true);
      }
    })();

    return () => { cancelled = true; };
  }, [isImage, viewMode, file.file_path]);

  // Click timer for distinguishing single-click (select) from double-click (open)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup click timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  // Handle click with timer to distinguish single-click from double-click
  const handleClick = (e: React.MouseEvent) => {
    // Don't handle if clicking on menu button
    if ((e.target as HTMLElement).closest('button')) return;

    e.preventDefault();
    e.stopPropagation();

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      // First click - start timer for single-click
      clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          // Single click - select
          onSelect(file.id, e);
        }
        clickCountRef.current = 0;
      }, 250);
    } else if (clickCountRef.current === 2) {
      // Double click - open file
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      clickCountRef.current = 0;
      onOpen(file);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
    setShowMenu(false);
  };

  // Handle menu button click - calculate position for portal
  const handleMenuButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.right, y: rect.bottom + 4 });
    }
    setShowMenu(!showMenu);
  };

  // Grid view layout
  if (viewMode === "grid") {
    return (
      <>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          className={cn(
            "bg-white rounded-xl border border-[#E5E7EB] overflow-hidden transition-colors cursor-pointer",
            isDragging && "opacity-50",
            isSelected && "ring-2 ring-primary",
            !isDragging && !isSelected && "hover:border-[#D1D5DB]"
          )}
        >
          {/* Preview area */}
          <div className="bg-[#F5F5F5] flex items-center justify-center h-[140px] overflow-hidden">
            {isImage && previewUrl && !previewError ? (
              <img
                src={previewUrl}
                alt={file.file_name}
                className="w-full h-full object-cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <FileTypeIcon mimeType={file.mime_type} size={64} />
            )}
          </div>
          {/* Content area */}
          <div className="p-3">
            {/* Name and menu row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-medium truncate flex-1">{file.file_name}</span>
              <button
                ref={menuButtonRef}
                onClick={handleMenuButtonClick}
                className="p-1 rounded-md hover:bg-muted transition-colors shrink-0"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {/* Date and size row */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{moment(file.created_at).locale(language).format("LL")}</span>
              <span>{formatBytes(file.file_size)}</span>
            </div>
          </div>
        </div>

        {/* Three-dot Menu - Portal */}
        {showMenu && typeof document !== 'undefined' && createPortal(
          <div
            ref={menuRef}
            className="fixed bg-card border rounded-lg shadow-lg py-1 min-w-[140px] z-50"
            style={{ left: menuPos.x - 140, top: menuPos.y }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onOpen(file);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t("file.menu.open")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDownload(file);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t("file.menu.download")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onRename(file);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              {t("file.menu.rename")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onMove(file);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <FolderInput className="h-4 w-4" />
              {t("file.menu.move")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete(file.id);
              }}
              disabled={isDeleting}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? t("folder.deleting") : t("folder.menu.delete")}
            </button>
          </div>,
          document.body
        )}

        {/* Right-click Context Menu - Portal */}
        {showContextMenu && typeof document !== 'undefined' && createPortal(
          <div
            ref={contextMenuRef}
            className="fixed bg-card border rounded-lg shadow-lg py-1 min-w-[140px] z-50"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                onOpen(file);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t("file.menu.open")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                onDownload(file);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t("file.menu.download")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                onRename(file);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              {t("file.menu.rename")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                onMove(file);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <FolderInput className="h-4 w-4" />
              {t("file.menu.move")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                onDelete(file.id);
              }}
              disabled={isDeleting}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? t("folder.deleting") : t("folder.menu.delete")}
            </button>
          </div>,
          document.body
        )}
      </>
    );
  }

  // List view layout (default)
  return (
    <>
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={cn(
        "grid grid-cols-[2fr_1fr_100px_200px_50px] gap-3 px-5 py-3 text-[15px] transition-colors items-center cursor-pointer border-b border-figma-disabled text-figma-black",
        isDragging && "opacity-50",
        isSelected && "bg-[#dbf0fa]",
        !isDragging && !isSelected && "hover:bg-[#f5f5f5]"
      )}
    >
      <div className="flex items-center gap-3 truncate">
        <FileTypeIcon mimeType={file.mime_type} size={40} />
        <div className="truncate">
          <div className="font-normal truncate">{file.file_name}</div>
        </div>
      </div>
      <div className="truncate text-figma-black">
        {getFileFormatName(file.mime_type)}
      </div>
      <div className="text-figma-black">{formatBytes(file.file_size)}</div>
      <div className="text-figma-black">
        {moment(file.created_at).locale(language).format("LL")}
      </div>
      <div className="text-right">
        <button
          ref={menuButtonRef}
          onClick={handleMenuButtonClick}
          className="p-1.5 rounded-md hover:bg-[#e5e5e5] transition-colors"
        >
          <MoreVertical className="h-5 w-5 text-figma-light" />
        </button>
      </div>
    </div>

    {/* Three-dot Menu - Portal */}
    {showMenu && typeof document !== 'undefined' && createPortal(
      <div
        ref={menuRef}
        className="fixed bg-card border rounded-lg shadow-lg py-1 min-w-[140px] z-50"
        style={{ left: menuPos.x - 140, top: menuPos.y }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
            onOpen(file);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {t("file.menu.open")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
            onDownload(file);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {t("file.menu.download")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
            onRename(file);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          {t("file.menu.rename")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
            onMove(file);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <FolderInput className="h-4 w-4" />
          {t("file.menu.move")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
            onDelete(file.id);
          }}
          disabled={isDeleting}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? t("folder.deleting") : t("folder.menu.delete")}
        </button>
      </div>,
      document.body
    )}

    {/* Right-click Context Menu - Portal */}
    {showContextMenu && typeof document !== 'undefined' && createPortal(
      <div
        ref={contextMenuRef}
        className="fixed bg-card border rounded-lg shadow-lg py-1 min-w-[140px] z-50"
        style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
            onOpen(file);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {t("file.menu.open")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
            onDownload(file);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {t("file.menu.download")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
            onRename(file);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          {t("file.menu.rename")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
            onMove(file);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <FolderInput className="h-4 w-4" />
          {t("file.menu.move")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
            onDelete(file.id);
          }}
          disabled={isDeleting}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? t("folder.deleting") : t("folder.menu.delete")}
        </button>
      </div>,
      document.body
    )}
    </>
  );
}
