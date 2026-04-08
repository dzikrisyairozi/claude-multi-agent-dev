"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { FolderPlus, Folder, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { useLanguage } from "@/providers/LanguageProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useFolderContentsQuery,
  useCreateFolderMutation,
  useRenameFolderMutation,
  useDeleteFolderMutation,
  useMoveFolderMutation,
  useMoveFileMutation,
  useBulkMoveMutation,
  useRenameFileMutation,
} from "@/hooks/files";
import { useFileDownload } from "@/hooks/files/useFileDownload";
import { FolderBreadcrumb } from "./FolderBreadcrumb";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { RenameDialog } from "./RenameDialog";
import { FolderItem } from "./FolderItem";
import { FileItem } from "./FileItem";
import { SelectionToolbar } from "./SelectionToolbar";
import { MoveFolderDialog, MoveItemInfo } from "./MoveFolderDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ViewToggle, ViewMode } from "./ViewToggle";
import { FilterPanel, FilterState } from "./FilterPanel";
import { CollapsibleSection } from "./CollapsibleSection";
import { ChatFAB } from "./ChatFAB";
import { FolderRecord } from "@/types/folder";
import { DocumentRecord } from "@/types/document";
import { getFileIconType } from "@/lib/fileIcons";

type DragItem =
  | { type: "folder"; item: FolderRecord }
  | { type: "file"; item: DocumentRecord };

export function FilesPageClient() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FolderRecord | null>(null);
  const [renameFileTarget, setRenameFileTarget] =
    useState<DocumentRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: "folder" | "file";
  } | null>(null);
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveTargets, setMoveTargets] = useState<MoveItemInfo[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    fileTypes: [],
    dateRange: "all",
    sizeRange: "all",
  });
  const lastSelectedIdRef = useRef<string | null>(null);

  // Query hooks
  const { folders, documents, breadcrumbs, isLoading, refetch } =
    useFolderContentsQuery(currentFolderId);

  // Mutation hooks
  const createFolder = useCreateFolderMutation();
  const renameFolder = useRenameFolderMutation();
  const renameFile = useRenameFileMutation();
  const deleteFolder = useDeleteFolderMutation();
  const moveFolder = useMoveFolderMutation();
  const moveFile = useMoveFileMutation();
  const bulkMove = useBulkMoveMutation();
  const { downloadFile } = useFileDownload();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // Helper function to check date range
  const isWithinDateRange = (dateStr: string, range: string): boolean => {
    if (range === "all") return true;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    switch (range) {
      case "7days": return diffDays <= 7;
      case "30days": return diffDays <= 30;
      case "90days": return diffDays <= 90;
      default: return true;
    }
  };

  // Helper function to check size range
  const isWithinSizeRange = (size: number | null, range: string): boolean => {
    if (range === "all" || size === null) return range === "all";
    const mb = size / (1024 * 1024);
    switch (range) {
      case "small": return mb < 1;
      case "medium": return mb >= 1 && mb <= 10;
      case "large": return mb > 10;
      default: return true;
    }
  };

  // Filtered folders and documents based on search query and filters
  const filteredFolders = useMemo(() => {
    let result = folders;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(query));
    }

    // File type filter - if folder is selected or no types selected, show folders
    if (filters.fileTypes.length > 0 && !filters.fileTypes.includes("folder")) {
      result = [];
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      result = result.filter((f) => isWithinDateRange(f.updated_at, filters.dateRange));
    }

    return result;
  }, [folders, searchQuery, filters]);

  const filteredDocuments = useMemo(() => {
    let result = documents;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((d) => d.file_name.toLowerCase().includes(query));
    }

    // File type filter
    if (filters.fileTypes.length > 0) {
      const allowedTypes = filters.fileTypes.filter((t) => t !== "folder");
      if (allowedTypes.length > 0) {
        result = result.filter((d) => {
          const iconType = getFileIconType(d.mime_type);
          return allowedTypes.includes(iconType) || allowedTypes.includes("default");
        });
      }
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      result = result.filter((d) => isWithinDateRange(d.created_at, filters.dateRange));
    }

    // Size range filter
    if (filters.sizeRange !== "all") {
      result = result.filter((d) => isWithinSizeRange(d.file_size, filters.sizeRange));
    }

    return result;
  }, [documents, searchQuery, filters]);

  // Combined items array for range selection
  const allItems = useMemo(() => {
    const folderItems = filteredFolders.map((f) => ({
      id: f.id,
      type: "folder" as const,
    }));
    const fileItems = filteredDocuments.map((d) => ({
      id: d.id,
      type: "file" as const,
    }));
    return [...folderItems, ...fileItems];
  }, [filteredFolders, filteredDocuments]);

  // Navigate to folder
  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedIds(new Set()); // Clear selection when navigating
    lastSelectedIdRef.current = null;
  };

  // Select item (folder or file) - Google Drive style
  const handleSelectItem = useCallback(
    (id: string, event: React.MouseEvent) => {
      const isCtrlOrCmd = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      if (isShift && lastSelectedIdRef.current) {
        // Shift+click: select range
        const lastIndex = allItems.findIndex(
          (item) => item.id === lastSelectedIdRef.current
        );
        const currentIndex = allItems.findIndex((item) => item.id === id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = allItems
            .slice(start, end + 1)
            .map((item) => item.id);

          setSelectedIds((prev) => {
            const newSet = new Set(prev);
            rangeIds.forEach((itemId) => newSet.add(itemId));
            return newSet;
          });
        }
      } else if (isCtrlOrCmd) {
        // Ctrl/Cmd+click: toggle individual item
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return newSet;
        });
        lastSelectedIdRef.current = id;
      } else {
        // Plain click: select only this item
        setSelectedIds(new Set([id]));
        lastSelectedIdRef.current = id;
      }
    },
    [allItems]
  );

  // Clear selection
  const handleClearSelection = () => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  };

  // Get selection info for toolbar
  const getSelectionInfo = useCallback(() => {
    const selectedFolders = folders.filter((f) => selectedIds.has(f.id));
    const selectedFiles = documents.filter((d) => selectedIds.has(d.id));
    const hasFolders = selectedFolders.length > 0;
    const hasFiles = selectedFiles.length > 0;

    let selectionType: "folder" | "file" | "mixed" | null = null;
    if (hasFolders && hasFiles) selectionType = "mixed";
    else if (hasFolders) selectionType = "folder";
    else if (hasFiles) selectionType = "file";

    return { selectedFolders, selectedFiles, selectionType };
  }, [folders, documents, selectedIds]);

  // Handle move from toolbar
  const handleMoveFromSelection = () => {
    const { selectedFolders, selectedFiles } = getSelectionInfo();
    const items: MoveItemInfo[] = [
      ...selectedFolders.map((f) => ({
        id: f.id,
        type: "folder" as const,
        name: f.name,
      })),
      ...selectedFiles.map((f) => ({
        id: f.id,
        type: "file" as const,
        name: f.file_name,
      })),
    ];
    if (items.length > 0) {
      setMoveTargets(items);
    }
  };

  // Handle move from individual item context menu — respects multi-selection
  const handleMoveFile = (f: DocumentRecord) => {
    if (selectedIds.size > 1 && selectedIds.has(f.id)) {
      handleMoveFromSelection();
    } else {
      setMoveTargets([{ id: f.id, type: "file", name: f.file_name }]);
    }
  };

  const handleMoveFolder = (f: FolderRecord) => {
    if (selectedIds.size > 1 && selectedIds.has(f.id)) {
      handleMoveFromSelection();
    } else {
      setMoveTargets([{ id: f.id, type: "folder", name: f.name }]);
    }
  };

  // Handle delete from toolbar (batch delete)
  const handleDeleteFromSelection = async () => {
    const { selectedFolders, selectedFiles } = getSelectionInfo();
    const totalCount = selectedFolders.length + selectedFiles.length;

    if (totalCount === 0) return;

    const confirmMsg =
      totalCount === 1
        ? t("folder.delete.confirm", {
            name:
              selectedFolders[0]?.name || selectedFiles[0]?.file_name || "item",
          })
        : t("selection.delete.confirm", { count: totalCount });

    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;

    // Delete folders
    for (const folder of selectedFolders) {
      setDeletingId(folder.id);
      try {
        await deleteFolder.mutateAsync(folder.id);
      } catch {
        // Continue with other deletions
      }
    }

    // Delete files
    for (const file of selectedFiles) {
      if (!session?.access_token) continue;
      setDeletingId(file.id);
      try {
        const res = await fetch(`/api/files/${file.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const errMsg =
            payload?.error === "FILE_LINKED_TO_RINGI"
              ? t("toast.fileLinkedToRingi", {
                  ringiTitles: (payload.ringiTitles as string[]).join(", "),
                })
              : payload?.error || t("toast.deleteFileFailed");
          toast.error(`${file.file_name}: ${errMsg}`);
        } else {
          toast.success(`${file.file_name}: ${t("toast.fileDeleted")}`);
        }
      } catch {
        toast.error(`${file.file_name}: ${t("toast.deleteFileFailed")}`);
      }
    }

    setDeletingId(null);
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
    refetch();
  };

  // Handle view from toolbar (only for single folder)
  const handleViewFromSelection = () => {
    const { selectedFolders } = getSelectionInfo();
    if (selectedFolders.length === 1) {
      handleNavigate(selectedFolders[0].id);
    }
  };

  // Check if View button should be shown
  const canViewSelection = useMemo(() => {
    const { selectedFolders, selectedFiles } = getSelectionInfo();
    return selectedFolders.length === 1 && selectedFiles.length === 0;
  }, [getSelectionInfo]);

  // Handle rename from toolbar (only for single item)
  const handleRenameFromSelection = useCallback(() => {
    const { selectedFolders, selectedFiles } = getSelectionInfo();
    if (selectedFolders.length === 1 && selectedFiles.length === 0) {
      setRenameTarget(selectedFolders[0]);
    } else if (selectedFiles.length === 1 && selectedFolders.length === 0) {
      setRenameFileTarget(selectedFiles[0]);
    }
  }, [getSelectionInfo]);

  // Check if Rename button should be shown (only when single item selected)
  const canRenameSelection = useMemo(() => {
    const { selectedFolders, selectedFiles } = getSelectionInfo();
    const total = selectedFolders.length + selectedFiles.length;
    return total === 1;
  }, [getSelectionInfo]);

  // Open file (in new tab)
  const handleOpenFile = useCallback(
    (file: DocumentRecord) => {
      downloadFile(file, "open");
    },
    [downloadFile]
  );

  // Download file
  const handleDownloadFile = useCallback(
    (file: DocumentRecord) => {
      downloadFile(file, "download");
    },
    [downloadFile]
  );

  // Handle open from toolbar (only for single file)
  const handleOpenFromSelection = useCallback(() => {
    const { selectedFiles } = getSelectionInfo();
    if (selectedFiles.length === 1) {
      handleOpenFile(selectedFiles[0]);
    }
  }, [getSelectionInfo, handleOpenFile]);

  // Check if Open button should be shown (only when single file selected)
  const canOpenSelection = useMemo(() => {
    const { selectedFolders, selectedFiles } = getSelectionInfo();
    return selectedFiles.length === 1 && selectedFolders.length === 0;
  }, [getSelectionInfo]);

  // Confirm move (bulk)
  const handleConfirmMove = (targetFolderId: string | null) => {
    if (moveTargets.length === 0) return;
    bulkMove.mutate(
      {
        targetFolderId,
        items: moveTargets.map((item) => ({ id: item.id, type: item.type })),
      },
      {
        onSuccess: () => {
          setMoveTargets([]);
          setSelectedIds(new Set());
          lastSelectedIdRef.current = null;
        },
      }
    );
  };

  // Create folder
  const handleCreateFolder = (name: string) => {
    createFolder.mutate(
      { name, parent_id: currentFolderId },
      {
        onSuccess: () => setShowCreateDialog(false),
      }
    );
  };

  // Rename folder
  const handleRenameFolder = (newName: string) => {
    if (!renameTarget) return;
    renameFolder.mutate(
      {
        folderId: renameTarget.id,
        name: newName,
        previousName: renameTarget.name,
      },
      {
        onSuccess: () => setRenameTarget(null),
      }
    );
  };

  // Rename file
  const handleRenameFile = (newName: string) => {
    if (!renameFileTarget) return;
    renameFile.mutate(
      {
        fileId: renameFileTarget.id,
        fileName: newName,
        previousFileName: renameFileTarget.file_name,
      },
      {
        onSuccess: () => setRenameFileTarget(null),
      }
    );
  };

  // Delete folder - opens confirmation dialog
  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    const name = folder?.name || "this folder";
    setDeleteTarget({ id: folderId, name, type: "folder" });
  };

  // Delete file - opens confirmation dialog
  const handleDeleteFile = (fileId: string) => {
    const file = documents.find((d) => d.id === fileId);
    const name = file?.file_name || "this file";
    setDeleteTarget({ id: fileId, name, type: "file" });
  };

  // Confirm delete - executes the actual deletion
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { id, type } = deleteTarget;

    if (type === "folder") {
      setDeletingId(id);
      try {
        await deleteFolder.mutateAsync(id);
      } finally {
        setDeletingId(null);
        setDeleteTarget(null);
      }
    } else {
      if (!session?.access_token) {
        toast.error(t("toast.sessionMissing"));
        setDeleteTarget(null);
        return;
      }

      setDeletingId(id);
      try {
        const res = await fetch(`/api/files/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const errMsg =
            payload?.error === "FILE_LINKED_TO_RINGI"
              ? t("toast.fileLinkedToRingi", {
                  ringiTitles: (payload.ringiTitles as string[]).join(", "),
                })
              : payload?.error || t("toast.deleteFileFailed");
          throw new Error(errMsg);
        }

        refetch();
        queryClient.invalidateQueries({ queryKey: ["documentsExist"] });
        toast.success(t("toast.fileDeleted"));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t("toast.deleteFileFailed");
        toast.error(message);
      } finally {
        setDeletingId(null);
        setDeleteTarget(null);
      }
    }
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragItem | undefined;
    if (data) {
      setActiveItem(data);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeData = active.data.current as DragItem | undefined;
    const overData = over.data.current as
      | { type: string; item: FolderRecord }
      | undefined;

    if (!activeData || !overData) return;

    // Only allow dropping onto folders
    if (overData.type !== "folder") return;

    const targetFolderId = overData.item.id;

    if (activeData.type === "file") {
      // Moving file to folder
      const file = activeData.item as DocumentRecord;
      if (file.folder_id === targetFolderId) return; // Already in target folder

      moveFile.mutate({
        fileId: file.id,
        targetFolderId,
        previousFolderId: file.folder_id,
      });
    } else if (activeData.type === "folder") {
      // Moving folder to another folder
      const folder = activeData.item as FolderRecord;
      if (folder.id === targetFolderId) return; // Can't move folder into itself
      if (folder.parent_id === targetFolderId) return; // Already in target folder

      moveFolder.mutate({
        folderId: folder.id,
        targetFolderId,
        previousParentId: folder.parent_id,
      });
    }
  };

  const totalItems = folders.length + documents.length;
  const filteredTotalItems = filteredFolders.length + filteredDocuments.length;

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {t("files.header.title")}
            </h2>
            <p className="text-muted-foreground">
              {totalItems === 1
                ? t("files.header.itemCount", { count: totalItems })
                : t("files.header.itemCountPlural", { count: totalItems })}
            </p>
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Search and Actions Bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 flex items-center h-[45px] px-5 rounded-[10px] border border-figma-border">
            <Search className="h-5 w-5 mr-3 shrink-0 text-figma-light" />
            <input
              type="text"
              placeholder={t("files.search.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#c3c5cb] text-figma-black"
            />
          </div>
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
          />
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 h-[45px] px-4 rounded-lg text-[15px] font-normal text-white transition-colors hover:opacity-90 bg-figma-primary"
          >
            <FolderPlus className="h-5 w-5" />
            {t("files.header.newFolder")}
          </button>
        </div>

        {/* Breadcrumb - Only show when inside a folder */}
        {currentFolderId && (
          <div className="mb-4">
            <FolderBreadcrumb
              breadcrumbs={breadcrumbs}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* Selection Toolbar */}
        <SelectionToolbar
          selectedCount={selectedIds.size}
          onClear={handleClearSelection}
          onView={canViewSelection ? handleViewFromSelection : undefined}
          onOpen={canOpenSelection ? handleOpenFromSelection : undefined}
          onRename={canRenameSelection ? handleRenameFromSelection : undefined}
          onMove={handleMoveFromSelection}
          onDelete={handleDeleteFromSelection}
          isDeleting={deletingId !== null}
        />

        {/* File List */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className={cn(
              "rounded-[10px] overflow-hidden bg-figma-white",
              viewMode === "list" && "border border-figma-border"
            )}
          >
            {/* Table Header - Only show in list view */}
            {viewMode === "list" && (
              <div className="grid grid-cols-[2fr_1fr_100px_200px_50px] gap-3 px-5 py-3 text-[15px] font-normal uppercase tracking-wide text-figma-light border-b border-figma-disabled">
                <span>{t("files.table.name")}</span>
                <span>{t("files.table.fileFormat")}</span>
                <span>{t("files.table.size")}</span>
                <span>{t("files.table.lastModified")}</span>
                <span></span>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("files.loading")}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredTotalItems === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>{searchQuery ? t("files.noResults") : t("files.empty")}</p>
                <p className="text-xs mt-1">{searchQuery ? "" : t("files.emptyHint")}</p>
              </div>
            )}

            {/* Items - List View */}
            {!isLoading && filteredTotalItems > 0 && viewMode === "list" && (
              <div>
                {/* Folders Section */}
                {filteredFolders.length > 0 && (
                  <div>
                    {filteredFolders.map((folder) => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        viewMode="list"
                        onOpen={handleNavigate}
                        onSelect={handleSelectItem}
                        onRename={setRenameTarget}
                        onMove={handleMoveFolder}
                        onDelete={handleDeleteFolder}
                        isSelected={selectedIds.has(folder.id)}
                        isDeleting={deletingId === folder.id}
                      />
                    ))}
                  </div>
                )}

                {/* Files Section */}
                {filteredDocuments.length > 0 && (
                  <div>
                    {filteredDocuments.map((file) => (
                      <FileItem
                        key={file.id}
                        file={file}
                        viewMode="list"
                        onSelect={handleSelectItem}
                        onOpen={handleOpenFile}
                        onDownload={handleDownloadFile}
                        onRename={setRenameFileTarget}
                        onMove={handleMoveFile}
                        onDelete={handleDeleteFile}
                        isSelected={selectedIds.has(file.id)}
                        isDeleting={deletingId === file.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Items - Grid View with Collapsible Sections */}
          {!isLoading && viewMode === "grid" && (
            <div className="space-y-2">
              {/* Folders Section */}
              <CollapsibleSection
                title={t("files.section.folders")}
                itemCount={filteredFolders.length}
                defaultExpanded={true}
              >
                {filteredFolders.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredFolders.map((folder) => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        viewMode="grid"
                        onOpen={handleNavigate}
                        onSelect={handleSelectItem}
                        onRename={setRenameTarget}
                        onMove={handleMoveFolder}
                        onDelete={handleDeleteFolder}
                        isSelected={selectedIds.has(folder.id)}
                        isDeleting={deletingId === folder.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4">
                    {t("files.noFolders")}
                  </div>
                )}
              </CollapsibleSection>

              {/* Files Section */}
              <CollapsibleSection
                title={t("files.section.files")}
                itemCount={filteredDocuments.length}
                defaultExpanded={true}
              >
                {filteredDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredDocuments.map((file) => (
                      <FileItem
                        key={file.id}
                        file={file}
                        viewMode="grid"
                        onSelect={handleSelectItem}
                        onOpen={handleOpenFile}
                        onDownload={handleDownloadFile}
                        onRename={setRenameFileTarget}
                        onMove={handleMoveFile}
                        onDelete={handleDeleteFile}
                        isSelected={selectedIds.has(file.id)}
                        isDeleting={deletingId === file.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4">
                    {t("files.noFiles")}
                  </div>
                )}
              </CollapsibleSection>
            </div>
          )}

          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem && (
              <div className="bg-card border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 opacity-90">
                {activeItem.type === "folder" ? (
                  <>
                    <Folder className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {(activeItem.item as FolderRecord).name}
                    </span>
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">
                      {(activeItem.item as DocumentRecord).file_name}
                    </span>
                  </>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Create Folder Dialog */}
        <CreateFolderDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onConfirm={handleCreateFolder}
          isLoading={createFolder.isPending}
        />

        {/* Rename Folder Dialog */}
        <RenameDialog
          isOpen={!!renameTarget}
          currentName={renameTarget?.name || ""}
          itemType="folder"
          onClose={() => setRenameTarget(null)}
          onConfirm={handleRenameFolder}
          isLoading={renameFolder.isPending}
        />

        {/* Rename File Dialog */}
        <RenameDialog
          isOpen={!!renameFileTarget}
          currentName={renameFileTarget?.file_name || ""}
          itemType="file"
          onClose={() => setRenameFileTarget(null)}
          onConfirm={handleRenameFile}
          isLoading={renameFile.isPending}
        />

        {/* Move Items Dialog */}
        <MoveFolderDialog
          isOpen={moveTargets.length > 0}
          itemsToMove={moveTargets}
          currentFolderId={currentFolderId}
          excludeFolderIds={selectedIds}
          onClose={() => setMoveTargets([])}
          onConfirm={handleConfirmMove}
          isLoading={bulkMove.isPending}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          isOpen={!!deleteTarget}
          itemName={deleteTarget?.name || ""}
          itemType={deleteTarget?.type || "folder"}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isLoading={!!deletingId}
        />

        {/* Chat FAB */}
        <ChatFAB />
      </div>
    </MainLayout>
  );
}
