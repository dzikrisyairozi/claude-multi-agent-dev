"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getKnowledgeEntries } from "@/service/mgapp/knowledgeBase";
import { MgappKnowledgeEntry } from "@/types/mgapp";
import { KnowledgeEntryTable } from "./_components/knowledge-entry-table";
import { CreateKnowledgeEntryDialog } from "./_components/create-knowledge-entry-dialog";
import { EditKnowledgeEntrySheet } from "./_components/edit-knowledge-entry-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

export default function KnowledgeBasePage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editingEntry, setEditingEntry] = useState<MgappKnowledgeEntry | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  const {
    data: entriesResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["knowledge-entries"],
    queryFn: getKnowledgeEntries,
  });

  const entries = entriesResult?.data ?? [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["knowledge-entries"] });
  };

  const handleEdit = (entry: MgappKnowledgeEntry) => {
    setEditingEntry(entry);
    setIsEditOpen(true);
  };

  const handleEditSuccess = () => {
    handleRefresh();
    setEditingEntry(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("knowledgeBase.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("knowledgeBase.subtitle")}
          </p>
        </div>
      </div>

      {error || entriesResult?.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("knowledgeBase.error")}</AlertTitle>
          <AlertDescription>
            {entriesResult?.error || t("knowledgeBase.failedToLoad")}
          </AlertDescription>
        </Alert>
      ) : (
        <KnowledgeEntryTable
          entries={entries}
          isLoading={isLoading}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
          createButton={<CreateKnowledgeEntryDialog onSuccess={handleRefresh} />}
        />
      )}

      <EditKnowledgeEntrySheet
        entry={editingEntry}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingEntry(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
