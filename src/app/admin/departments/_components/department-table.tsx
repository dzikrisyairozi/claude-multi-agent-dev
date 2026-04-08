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
import { Pencil, Trash2, Search, TriangleAlert } from "lucide-react";
import { Department } from "@/types/department";
import { toast } from "sonner";
import { deleteDepartment, getDepartmentUserCount } from "@/service/admin/department";
import { useState, useEffect } from "react";
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

interface DepartmentTableProps {
  departments: Department[];
  onEdit: (department: Department) => void;
  onRefresh: () => void;
  isLoading: boolean;
  createButton?: React.ReactNode;
}

export function DepartmentTable({
  departments,
  onEdit,
  onRefresh,
  isLoading,
  createButton,
}: DepartmentTableProps) {
  const { t } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteUserCount, setDeleteUserCount] = useState<number>(0);
  const [isCheckingUsers, setIsCheckingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDepartments = departments.filter((dept) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      dept.name.toLowerCase().includes(searchLower) ||
      (dept.description?.toLowerCase() || "").includes(searchLower)
    );
  });

  const {
    currentPage,
    totalPages,
    currentItems: currentDepartments,
    setCurrentPage,
    startIndex,
    endIndex,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ items: filteredDepartments, itemsPerPage: 10 });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, setCurrentPage]);

  const handleDeleteClick = async (deptId: string) => {
    setDeleteId(deptId);
    setIsCheckingUsers(true);
    try {
      const { count } = await getDepartmentUserCount(deptId);
      setDeleteUserCount(count);
    } catch {
      setDeleteUserCount(0);
    } finally {
      setIsCheckingUsers(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await deleteDepartment(deleteId);
      if (error) {
        toast.error(error);
      } else {
        toast.success(t("departments.deleteSuccess"));
        onRefresh();
      }
    } catch {
      toast.error(t("departments.deleteFailed"));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className="relative w-full sm:w-[400px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("departments.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-gray-50/50 border-gray-200"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {createButton}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 py-4 px-5">
        <div className="rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("departments.name")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("departments.description")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("departments.status")}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-4">
                  {t("departments.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDepartments.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {t("departments.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                currentDepartments.map((dept) => (
                  <TableRow
                    key={dept.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <TableCell className="py-4 font-medium text-gray-900">
                      {dept.name}
                    </TableCell>
                    <TableCell className="py-4 text-gray-600">
                      {dept.description || "-"}
                    </TableCell>
                    <TableCell className="py-4">
                      {dept.is_active ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                          {t("departments.active")}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {t("departments.inactive")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-900"
                          onClick={() => onEdit(dept)}
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 text-red-600"
                          onClick={() => handleDeleteClick(dept.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
            totalItems={filteredDepartments.length}
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
              {t("departments.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {isCheckingUsers ? (
                  t("departments.checkingUsers")
                ) : deleteUserCount > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                      <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium">
                        {t("departments.confirmDeleteWithUsers").replace(
                          "{count}",
                          String(deleteUserCount)
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  t("departments.confirmDelete")
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("departments.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isCheckingUsers}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t("departments.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
