"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { MoreVertical, Trash2, FolderInput, FolderOpen, Pencil } from "lucide-react";
import { FolderRecord } from "@/types/folder";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import moment from "moment";
import { useLanguage } from "@/providers/LanguageProvider";
import { FileTypeIcon } from "./FileTypeIcon";

type ViewMode = "list" | "grid";

type FolderItemProps = {
  folder: FolderRecord;
  viewMode?: ViewMode;
  onOpen: (folderId: string) => void;
  onSelect: (folderId: string, event: React.MouseEvent) => void;
  onRename: (folder: FolderRecord) => void;
  onMove: (folder: FolderRecord) => void;
  onDelete: (folderId: string) => void;
  isSelected?: boolean;
  isDeleting?: boolean;
};

export function FolderItem({
  folder,
  viewMode = "list",
  onOpen,
  onSelect,
  onRename,
  onMove,
  onDelete,
  isSelected = false,
  isDeleting = false,
}: FolderItemProps) {
  const { t, language } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `folder-${folder.id}`,
    data: { type: "folder", item: folder },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-drop-${folder.id}`,
    data: { type: "folder", item: folder },
  });

  // Combine refs
  const setNodeRef = (node: HTMLDivElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
    setShowMenu(false);
  };

  // Handle single click with delay to distinguish from double-click
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't select if clicking on menu button
    if ((e.target as HTMLElement).closest('button')) return;

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Store modifier keys state since event won't be valid in timeout
    const isShift = e.shiftKey;
    const isCtrlOrCmd = e.metaKey || e.ctrlKey;

    // Set a timeout - if not cancelled by double-click, treat as single click
    clickTimeoutRef.current = setTimeout(() => {
      // Create a synthetic event-like object with modifier keys
      const syntheticEvent = {
        shiftKey: isShift,
        metaKey: isCtrlOrCmd,
        ctrlKey: isCtrlOrCmd,
      } as React.MouseEvent;
      onSelect(folder.id, syntheticEvent);
    }, 200);
  }, [folder.id, onSelect]);

  // Handle double-click to open folder
  const handleDoubleClick = useCallback(() => {
    // Cancel the single-click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    onOpen(folder.id);
  }, [folder.id, onOpen]);

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
          className={cn(
            "bg-white rounded-xl border border-[#E5E7EB] p-4 transition-colors cursor-pointer relative",
            isDragging && "opacity-50",
            isOver && "bg-primary/10 ring-2 ring-primary ring-inset",
            isSelected && "ring-2 ring-primary",
            !isDragging && !isOver && !isSelected && "hover:border-[#D1D5DB]"
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        >
          {/* Top row: Icon and menu */}
          <div className="flex items-start justify-between mb-3">
            <FileTypeIcon isFolder size={48} />
            <button
              ref={menuButtonRef}
              onClick={handleMenuButtonClick}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {/* Folder name */}
          <div className="text-sm font-medium truncate mb-1">{folder.name}</div>
          {/* Date */}
          <div className="text-xs text-muted-foreground">
            {moment(folder.updated_at).locale(language).format("LL")}
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
                onOpen(folder.id);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              {t("folder.menu.view")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onRename(folder);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              {t("folder.menu.rename")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onMove(folder);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <FolderInput className="h-4 w-4" />
              {t("folder.menu.move")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete(folder.id);
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
                onOpen(folder.id);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              {t("folder.menu.view")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                onRename(folder);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              {t("folder.menu.rename")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                onMove(folder);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <FolderInput className="h-4 w-4" />
              {t("folder.menu.move")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                onDelete(folder.id);
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
      className={cn(
        "grid grid-cols-[2fr_1fr_100px_200px_50px] gap-3 px-5 py-3 text-[15px] transition-colors items-center cursor-pointer border-b border-figma-disabled text-figma-black",
        isDragging && "opacity-50",
        isOver && "bg-[#dbf0fa] ring-2 ring-[#3abdf7] ring-inset",
        isSelected && "bg-[#dbf0fa]",
        !isDragging && !isOver && !isSelected && "hover:bg-[#f5f5f5]"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-center gap-3 truncate">
        <FileTypeIcon isFolder size={40} />
        <span className="font-normal truncate">{folder.name}</span>
      </div>
      <div className="text-figma-black">{t("folder.type")}</div>
      <div className="text-figma-black">—</div>
      <div className="text-figma-black">
        {moment(folder.updated_at).locale(language).format("LL")}
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
            onOpen(folder.id);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          {t("folder.menu.view")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
            onRename(folder);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          {t("folder.menu.rename")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
            onMove(folder);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <FolderInput className="h-4 w-4" />
          {t("folder.menu.move")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
            onDelete(folder.id);
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
            onOpen(folder.id);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          {t("folder.menu.view")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
            onRename(folder);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          {t("folder.menu.rename")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
            onMove(folder);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
        >
          <FolderInput className="h-4 w-4" />
          {t("folder.menu.move")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
            onDelete(folder.id);
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
