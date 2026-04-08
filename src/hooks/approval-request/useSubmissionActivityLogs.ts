"use client";

import { useQuery } from "@tanstack/react-query";
import { ActivityLogRecord } from "@/types/activityLog";
import { getActivityLogs } from "@/service/activityLog/activityLog";

export function useSubmissionActivityLogs(submissionId: string | undefined) {
  return useQuery<ActivityLogRecord[]>({
    queryKey: ["submission-activity-logs", submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const result = await getActivityLogs(
        { entity_type: "submission", entity_id: submissionId },
        100,
        0,
      );
      if (result.error) throw new Error(result.error);
      return result.data?.logs ?? [];
    },
    enabled: !!submissionId,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
}
