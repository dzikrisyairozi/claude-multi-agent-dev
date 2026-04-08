import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderContents } from "@/types/folder";
import { supabase } from "@/integrations/supabase/client";

async function fetchFolderContents(
  folderId: string | null
): Promise<FolderContents> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const id = folderId ?? "root";
  const response = await fetch(`/api/folders/${id}/contents`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch folder contents");
  }

  return response.json();
}

export function useFolderContentsQuery(folderId: string | null) {
  const query = useQuery<FolderContents, Error>({
    queryKey: ["folder-contents", folderId],
    queryFn: () => fetchFolderContents(folderId),
    staleTime: 1000 * 30, // 30 seconds
  });

  useEffect(() => {
    if (query.error) {
      toast.error("Unable to load folder contents", {
        description: query.error.message,
      });
    }
  }, [query.error]);

  return {
    contents: query.data ?? null,
    folders: query.data?.folders ?? [],
    documents: query.data?.documents ?? [],
    breadcrumbs: query.data?.breadcrumbs ?? [],
    currentFolder: query.data?.folder ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
