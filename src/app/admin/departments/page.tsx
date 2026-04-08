"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDepartments } from "@/service/admin/department";
import { Department } from "@/types/department";
import { DepartmentTable } from "./_components/department-table";
import { CreateDepartmentDialog } from "./_components/create-department-dialog";
import { EditDepartmentSheet } from "./_components/edit-department-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

export default function DepartmentsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  const {
    data: departmentsResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
  });

  const departments = departmentsResult?.data ?? [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departments"] });
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setIsEditOpen(true);
  };

  const handleEditSuccess = () => {
    handleRefresh();
    setEditingDepartment(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("departments.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("departments.subtitle")}
          </p>
        </div>
      </div>

      {error || departmentsResult?.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("departments.error")}</AlertTitle>
          <AlertDescription>
            {departmentsResult?.error || t("departments.failedToLoad")}
          </AlertDescription>
        </Alert>
      ) : (
        <DepartmentTable
          departments={departments}
          isLoading={isLoading}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
          createButton={<CreateDepartmentDialog onSuccess={handleRefresh} />}
        />
      )}

      <EditDepartmentSheet
        department={editingDepartment}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingDepartment(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
