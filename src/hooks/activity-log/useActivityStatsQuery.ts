import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActivityStats } from "@/types/activityLog";
import { getActivityStats } from "@/service/activityLog/activityLog";

async function fetchActivityStats(
  fromDate?: string,
  toDate?: string,
  userId?: string
): Promise<ActivityStats> {
  const result = await getActivityStats(fromDate, toDate, userId);

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data!;
}

export function useActivityStatsQuery(
  fromDate?: string,
  toDate?: string,
  userId?: string
) {
  const query = useQuery<ActivityStats, Error>({
    queryKey: ["activity-stats", fromDate, toDate, userId],
    queryFn: () => fetchActivityStats(fromDate, toDate, userId),
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.error) {
      toast.error("Unable to load activity stats", {
        description: query.error.message,
      });
    }
  }, [query.error]);

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
