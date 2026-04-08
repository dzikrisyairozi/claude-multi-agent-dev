import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchThreads as fetchThreadsFromDb } from "@/service/thread/thread";
import { ThreadListItem } from "@/types/thread";
import { useAuth } from "@/hooks/useAuth";

export function useThreadsQuery() {
  const { session } = useAuth();

  const query = useQuery<ThreadListItem[], Error>({
    queryKey: ["threads"],
    queryFn: () => fetchThreadsFromDb(),
    staleTime: 1000 * 60,
    enabled: !!session, // Only fetch when there's a valid session
  });

  useEffect(() => {
    if (query.error) {
      toast.error("Unable to load threads", {
        description: query.error.message,
      });
    }
  }, [query.error]);

  return {
    threads: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
