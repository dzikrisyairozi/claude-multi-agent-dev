import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DocumentRecord } from "@/types/document";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";

type MoveFileParams = {
  fileId: string;
  targetFolderId: string | null;
  previousFolderId?: string | null; // For undo capability
};

async function moveFile(params: MoveFileParams): Promise<DocumentRecord> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`/api/files/${params.fileId}/move`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ folder_id: params.targetFolderId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to move file");
  }

  return response.json();
}

export function useMoveFileMutation() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const mutation = useMutation<DocumentRecord, Error, MoveFileParams>({
    mutationFn: moveFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });

      // Show toast with undo action
      toast.success(t("toast.fileMoved"), {
        action: {
          label: t("toast.undo"),
          onClick: () => {
            // Move back to previous location
            mutation.mutate({
              fileId: variables.fileId,
              targetFolderId: variables.previousFolderId ?? null,
            });
          },
        },
        duration: 8000,
      });
    },
    onError: (error) => {
      toast.error("Failed to move file", {
        description: error.message,
      });
    },
  });

  return mutation;
}
