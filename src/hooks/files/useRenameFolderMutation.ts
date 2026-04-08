import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderRecord } from "@/types/folder";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";

type RenameFolderParams = {
  folderId: string;
  name: string;
  previousName?: string; // For undo capability
};

async function renameFolder(params: RenameFolderParams): Promise<FolderRecord> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`/api/folders/${params.folderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ name: params.name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to rename folder");
  }

  return response.json();
}

export function useRenameFolderMutation() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const mutation = useMutation<FolderRecord, Error, RenameFolderParams>({
    mutationFn: renameFolder,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });

      // Show toast with undo action if previous name was provided
      if (variables.previousName) {
        toast.success(t("toast.folderRenamed"), {
          action: {
            label: t("toast.undo"),
            onClick: () => {
              mutation.mutate({
                folderId: variables.folderId,
                name: variables.previousName!,
              });
            },
          },
          duration: 8000,
        });
      } else {
        toast.success(t("toast.folderRenamed"));
      }
    },
    onError: (error) => {
      toast.error("Failed to rename folder", {
        description: error.message,
      });
    },
  });

  return mutation;
}
