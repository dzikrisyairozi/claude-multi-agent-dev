import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchMessages as fetchMessagesFromDb } from "@/service/message/message";
import { MessageRecord } from "@/types/message";

export function useThreadMessagesQuery(threadId: string | null) {
  const query = useQuery<MessageRecord[], Error>({
    queryKey: ["threadMessages", threadId],
    queryFn: () => fetchMessagesFromDb(threadId as string),
    enabled: Boolean(threadId),
    staleTime: 5000, // Prevent re-fetch within 5s of setQueryData
  });

  useEffect(() => {
    if (query.error) {
      toast.error("Unable to load conversation", {
        description: query.error.message,
      });
    }
  }, [query.error]);

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
  };
}
