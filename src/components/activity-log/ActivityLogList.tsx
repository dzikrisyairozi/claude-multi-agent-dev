"use client";

import { ActivityLogRecord } from "@/types/activityLog";
import { ActivityLogItem } from "./ActivityLogItem";
import { Skeleton } from "@/components/ui/skeleton";
import { FileX } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

type ActivityLogListProps = {
  logs: ActivityLogRecord[];
  isLoading: boolean;
};

function ActivityLogSkeleton() {
  return (
    <div className="flex gap-4 p-4 border-b">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function ActivityLogList({ logs, isLoading }: ActivityLogListProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border">
        {Array.from({ length: 5 }).map((_, i) => (
          <ActivityLogSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-12 text-center">
        <FileX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t("activityLog.noActivity")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("activityLog.noActivityDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {logs.map((log) => (
        <ActivityLogItem key={log.id} log={log} />
      ))}
    </div>
  );
}
