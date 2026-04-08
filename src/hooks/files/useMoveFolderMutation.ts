import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderRecord } from "@/types/folder";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";

type MoveFolderParams = {
  folderId: string;
  targetFolderId: string | null;
  previousParentId?: string | null; // For undo capability
};

async function moveFolder(params: MoveFolderParams): Promise<FolderRecord> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`/api/folders/${params.folderId}/move`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ parent_id: params.targetFolderId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to move folder");
  }

  return response.json();
}

export function useMoveFolderMutation() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const mutation = useMutation<FolderRecord, Error, MoveFolderParams>({
    mutationFn: moveFolder,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });

      // Show toast with undo action
      toast.success(t("toast.folderMoved"), {
        action: {
          label: t("toast.undo"),
          onClick: () => {
            // Move back to previous location
            mutation.mutate({
              folderId: variables.folderId,
              targetFolderId: variables.previousParentId ?? null,
            });
          },
        },
        duration: 8000,
      });
    },
    onError: (error) => {
      toast.error("Failed to move folder", {
        description: error.message,
      });
    },
  });

  return mutation;
}
