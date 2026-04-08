import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderRecord, CreateFolderPayload } from "@/types/folder";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";

async function createFolder(payload: CreateFolderPayload): Promise<FolderRecord> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create folder");
  }

  return response.json();
}

export function useCreateFolderMutation() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation<FolderRecord, Error, CreateFolderPayload>({
    mutationFn: createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });
      toast.success(t("toast.folderCreated"));
    },
    onError: (error) => {
      toast.error("Failed to create folder", {
        description: error.message,
      });
    },
  });
}
