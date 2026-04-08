import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActivityLogRecord, ActivityLogFilters, ActivityStats } from "@/types/activityLog";
import { getActivityLogsWithStats } from "@/service/activityLog/activityLog";

type ActivityDataResponse = {
  logs: ActivityLogRecord[];
  total: number;
  stats: ActivityStats;
};

async function fetchActivityData(
  filters: ActivityLogFilters,
  limit: number,
  offset: number,
  userId?: string
): Promise<ActivityDataResponse> {
  const result = await getActivityLogsWithStats(filters, limit, offset, userId);

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data!;
}

export function useActivityDataQuery(
  filters: ActivityLogFilters = {},
  page: number = 1,
  pageSize: number = 10,
  userId?: string
) {
  const offset = (page - 1) * pageSize;

  const query = useQuery<ActivityDataResponse, Error>({
    queryKey: ["activity-data", filters, page, pageSize, userId],
    queryFn: () => fetchActivityData(filters, pageSize, offset, userId),
    staleTime: 1000 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.error) {
      toast.error("Unable to load activity data", {
        description: query.error.message,
      });
    }
  }, [query.error]);

  const totalPages = Math.ceil((query.data?.total ?? 0) / pageSize);

  return {
    logs: query.data?.logs ?? [],
    total: query.data?.total ?? 0,
    totalPages,
    stats: query.data?.stats ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
