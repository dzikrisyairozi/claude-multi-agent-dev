import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActivityLogRecord, ActivityLogFilters } from "@/types/activityLog";
import { getActivityLogs } from "@/service/activityLog/activityLog";

type ActivityLogsResponse = {
  logs: ActivityLogRecord[];
  total: number;
};

async function fetchActivityLogs(
  filters: ActivityLogFilters,
  limit: number,
  offset: number
): Promise<ActivityLogsResponse> {
  const result = await getActivityLogs(filters, limit, offset);

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data!;
}

export function useActivityLogsQuery(
  filters: ActivityLogFilters = {},
  page: number = 1,
  pageSize: number = 10
) {
  const offset = (page - 1) * pageSize;

  const query = useQuery<ActivityLogsResponse, Error>({
    queryKey: ["activity-logs", filters, page, pageSize],
    queryFn: () => fetchActivityLogs(filters, pageSize, offset),
    staleTime: 1000 * 30, // 30 seconds
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.error) {
      toast.error("Unable to load activity logs", {
        description: query.error.message,
      });
    }
  }, [query.error]);

  const totalPages = Math.ceil((query.data?.total ?? 0) / pageSize);

  return {
    logs: query.data?.logs ?? [],
    total: query.data?.total ?? 0,
    totalPages,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
