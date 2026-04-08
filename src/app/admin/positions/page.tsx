"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPositions } from "@/service/admin/position";
import { Position } from "@/types/position";
import { PositionTable } from "./_components/position-table";
import { CreatePositionDialog } from "./_components/create-position-dialog";
import { EditPositionSheet } from "./_components/edit-position-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

export default function PositionsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const {
    data: positionsResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["positions"],
    queryFn: getPositions,
  });

  const positions = positionsResult?.data ?? [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["positions"] });
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setIsEditOpen(true);
  };

  const handleEditSuccess = () => {
    handleRefresh();
    setEditingPosition(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("positions.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("positions.subtitle")}
          </p>
        </div>
      </div>

      {error || positionsResult?.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("positions.error")}</AlertTitle>
          <AlertDescription>
            {positionsResult?.error || t("positions.failedToLoad")}
          </AlertDescription>
        </Alert>
      ) : (
        <PositionTable
          positions={positions}
          isLoading={isLoading}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
          createButton={<CreatePositionDialog onSuccess={handleRefresh} />}
        />
      )}

      <EditPositionSheet
        position={editingPosition}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingPosition(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
