"use client";

import { useState } from "react";
import { FileText, ShoppingCart, Receipt, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { deleteCategoryType } from "@/service/admin/categoryType";
import { CategoryType, ParentCategory } from "@/types/categoryType";
import { useLanguage } from "@/providers/LanguageProvider";
import { CreateCategoryTypeDialog } from "./create-category-type-dialog";

interface CategoryGroupCardProps {
  category: ParentCategory;
  label: string;
  subtitle: string;
  types: CategoryType[];
  onEdit: (categoryType: CategoryType) => void;
  onRefresh: () => void;
}

const categoryIcons: Record<ParentCategory, React.ElementType> = {
  contracts: FileText,
  purchasing: ShoppingCart,
  expenses: Receipt,
  other: MoreHorizontal,
};

export function CategoryGroupCard({
  category,
  label,
  subtitle,
  types,
  onEdit,
  onRefresh,
}: CategoryGroupCardProps) {
  const { t } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const Icon = categoryIcons[category];

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await deleteCategoryType(deleteId);
      if (error) {
        toast.error(error);
      } else {
        toast.success(t("categoryTypes.deleteSuccess"));
        onRefresh();
      }
    } catch {
      toast.error(t("categoryTypes.deleteFailed"));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-sky-400 px-5 py-4 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{label}</h3>
            <p className="text-[10px] text-white/80">{subtitle}</p>
          </div>
        </div>
        <CreateCategoryTypeDialog category={category} onSuccess={onRefresh} />
      </div>

      {/* Table */}
      <div className="px-5 py-4">
        {types.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">{t("categoryTypes.noResults")}</p>
        ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-gray-100">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#c3c5cb]">
                {t("categoryTypes.name")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#c3c5cb]">
                {t("categoryTypes.notes")}
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-[#c3c5cb] pr-4">
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow
                key={type.id}
                className="border-b border-gray-100 hover:bg-gray-50/50"
              >
                <TableCell className="py-3 text-[15px] text-gray-900">
                  {type.name}
                </TableCell>
                <TableCell className="py-3 text-[15px] text-gray-600">
                  {type.notes || "-"}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => onEdit(type)}
                    >
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 text-red-600"
                      onClick={() => setDeleteId(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("categoryTypes.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("categoryTypes.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("categoryTypes.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t("categoryTypes.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
