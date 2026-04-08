import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";

async function deleteFolder(folderId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`/api/folders/${folderId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete folder");
  }
}

export function useDeleteFolderMutation() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation<void, Error, string>({
    mutationFn: deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });
      toast.success(t("toast.folderDeleted"));
    },
    onError: (error) => {
      toast.error("Failed to delete folder", {
        description: error.message,
      });
    },
  });
}
