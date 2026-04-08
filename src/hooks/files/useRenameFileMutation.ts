import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DocumentRecord } from "@/types/document";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";

type RenameFileParams = {
  fileId: string;
  fileName: string;
  previousFileName?: string; // For undo capability
};

async function renameFile(params: RenameFileParams): Promise<DocumentRecord> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`/api/files/${params.fileId}/rename`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ file_name: params.fileName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to rename file");
  }

  return response.json();
}

export function useRenameFileMutation() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const mutation = useMutation<DocumentRecord, Error, RenameFileParams>({
    mutationFn: renameFile,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });

      // Show toast with undo action if previous name was provided
      if (variables.previousFileName) {
        toast.success(t("toast.fileRenamed"), {
          action: {
            label: t("toast.undo"),
            onClick: () => {
              mutation.mutate({
                fileId: variables.fileId,
                fileName: variables.previousFileName!,
              });
            },
          },
          duration: 8000,
        });
      } else {
        toast.success(t("toast.fileRenamed"));
      }
    },
    onError: (error) => {
      toast.error("Failed to rename file", {
        description: error.message,
      });
    },
  });

  return mutation;
}
