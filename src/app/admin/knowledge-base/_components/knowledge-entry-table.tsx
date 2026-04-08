"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Search, Filter, X } from "lucide-react";
import { MgappKnowledgeEntry, MgappCategory, AISolvability } from "@/types/mgapp";
import { toast } from "sonner";
import { deleteKnowledgeEntry } from "@/service/mgapp/knowledgeBase";
import { useState, useEffect, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/table-pagination";
import { useLanguage } from "@/providers/LanguageProvider";

interface KnowledgeEntryTableProps {
  entries: MgappKnowledgeEntry[];
  onEdit: (entry: MgappKnowledgeEntry) => void;
  onRefresh: () => void;
  isLoading: boolean;
  createButton?: React.ReactNode;
}

const CATEGORY_LABELS: Record<string, string> = {
  hr: "HR / 人事",
  product: "Product / 製品",
  it: "IT",
  legal: "Legal / 法務",
  facilities: "Facilities / 総務",
  admin_finance: "Admin & Finance / 経理",
};

const SOLVABILITY_LABELS: Record<string, { label: string; className: string }> = {
  ai_answerable: {
    label: "AI Direct",
    className: "bg-green-100 text-green-600",
  },
  ai_supported: {
    label: "AI + Routing",
    className: "bg-blue-100 text-blue-600",
  },
  human_only: {
    label: "Human Only",
    className: "bg-amber-100 text-amber-600",
  },
};

export function KnowledgeEntryTable({
  entries,
  onEdit,
  onRefresh,
  isLoading,
  createButton,
}: KnowledgeEntryTableProps) {
  const { t } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSolvability, setFilterSolvability] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterCategory) count++;
    if (filterSolvability) count++;
    if (filterStatus) count++;
    return count;
  }, [filterCategory, filterSolvability, filterStatus]);

  const handleResetFilters = () => {
    setFilterCategory("");
    setFilterSolvability("");
    setFilterStatus("");
  };

  const filteredEntries = entries.filter((entry) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      entry.question.toLowerCase().includes(searchLower) ||
      entry.answer.toLowerCase().includes(searchLower) ||
      entry.category.toLowerCase().includes(searchLower);

    const matchesCategory =
      !filterCategory || entry.category === filterCategory;

    const matchesSolvability =
      !filterSolvability || entry.ai_solvability === filterSolvability;

    const matchesStatus =
      !filterStatus ||
      (filterStatus === "active" && entry.is_active) ||
      (filterStatus === "inactive" && !entry.is_active);

    return matchesSearch && matchesCategory && matchesSolvability && matchesStatus;
  });

  const {
    currentPage,
    totalPages,
    currentItems: currentEntries,
    setCurrentPage,
    startIndex,
    endIndex,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ items: filteredEntries, itemsPerPage: 10 });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterSolvability, filterStatus, setCurrentPage]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await deleteKnowledgeEntry(deleteId);
      if (error) {
        toast.error(error);
      } else {
        toast.success(t("knowledgeBase.deleteSuccess"));
        onRefresh();
      }
    } catch {
      toast.error(t("knowledgeBase.deleteFailed"));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + Filter + Create */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className="relative w-full sm:w-[300px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("knowledgeBase.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-gray-50/50 border-gray-200"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {/* Filter Popover */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`bg-white border-gray-200 text-gray-600 gap-2 ${
                  activeFilterCount > 0 ? "border-primary text-primary" : ""
                }`}
              >
                <Filter className="w-4 h-4" />
                {t("knowledgeBase.filter")}
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">
                    {t("knowledgeBase.filterOptions")}
                  </h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="text-xs text-gray-500 hover:text-gray-700 h-auto p-1"
                    >
                      <X className="w-3 h-3 mr-1" />
                      {t("knowledgeBase.resetFilters")}
                    </Button>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    {t("knowledgeBase.category")}
                  </Label>
                  <Select
                    value={filterCategory || "all"}
                    onValueChange={(val) => setFilterCategory(val === "all" ? "" : val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("knowledgeBase.allCategories")}</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Solvability */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    {t("knowledgeBase.solvability")}
                  </Label>
                  <Select
                    value={filterSolvability || "all"}
                    onValueChange={(val) => setFilterSolvability(val === "all" ? "" : val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("knowledgeBase.allSolvability")}</SelectItem>
                      {Object.entries(SOLVABILITY_LABELS).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    {t("knowledgeBase.status")}
                  </Label>
                  <Select
                    value={filterStatus || "all"}
                    onValueChange={(val) => setFilterStatus(val === "all" ? "" : val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("knowledgeBase.allStatus")}</SelectItem>
                      <SelectItem value="active">{t("knowledgeBase.active")}</SelectItem>
                      <SelectItem value="inactive">{t("knowledgeBase.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {createButton}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 py-4 px-5">
        <div className="rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("knowledgeBase.category")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("knowledgeBase.question")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("knowledgeBase.solvability")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("knowledgeBase.status")}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-4">
                  {t("knowledgeBase.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-gray-100">
                    <TableCell className="py-4">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex justify-end gap-2">
                        <div className="h-9 w-9 bg-gray-200 rounded-md animate-pulse" />
                        <div className="h-9 w-9 bg-gray-200 rounded-md animate-pulse" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : currentEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t("knowledgeBase.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                currentEntries.map((entry) => {
                  const solvability = SOLVABILITY_LABELS[entry.ai_solvability];
                  return (
                    <TableRow
                      key={entry.id}
                      className="border-b border-gray-100 hover:bg-gray-50/50"
                    >
                      <TableCell className="py-4 font-medium text-gray-900">
                        {CATEGORY_LABELS[entry.category] || entry.category}
                      </TableCell>
                      <TableCell className="py-4 text-gray-600 max-w-[300px] truncate">
                        {entry.question}
                      </TableCell>
                      <TableCell className="py-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${solvability?.className}`}
                        >
                          {solvability?.label}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {entry.is_active ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                            {t("knowledgeBase.active")}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {t("knowledgeBase.inactive")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => onEdit(entry)}
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 text-red-600"
                            onClick={() => setDeleteId(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredEntries.length}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            goToPreviousPage={goToPreviousPage}
            goToNextPage={goToNextPage}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("knowledgeBase.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("knowledgeBase.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("knowledgeBase.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t("knowledgeBase.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
