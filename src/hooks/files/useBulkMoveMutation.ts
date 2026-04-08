import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";

type MoveItem = {
  id: string;
  type: "folder" | "file";
};

type BulkMoveParams = {
  targetFolderId: string | null;
  items: MoveItem[];
};

type MoveResult = {
  id: string;
  type: "folder" | "file";
  success: boolean;
  error?: string;
};

type BulkMoveResponse = {
  results: MoveResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
};

async function bulkMove(params: BulkMoveParams): Promise<BulkMoveResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/move-items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      targetFolderId: params.targetFolderId,
      items: params.items,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to move items");
  }

  return response.json();
}

export function useBulkMoveMutation() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation<BulkMoveResponse, Error, BulkMoveParams>({
    mutationFn: bulkMove,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });

      const { summary } = data;
      if (summary.failed === 0) {
        toast.success(t("toast.movedItems", { count: summary.success }));
      } else if (summary.success === 0) {
        toast.error(t("toast.moveItemsFailed"));
      } else {
        toast.warning(`${t("toast.movedItems", { count: summary.success })}, ${summary.failed} failed`);
      }
    },
    onError: (error) => {
      toast.error(t("toast.moveItemsFailed"), {
        description: error.message,
      });
    },
  });
}
