"use client";

import { useMemo } from "react";
import { ApprovalRequestCard } from "./ApprovalRequestCard";
import { useLanguage } from "@/providers/LanguageProvider";

interface PendingApprovalRequestsProps {
  ids: string[];
}

export function PendingApprovalRequests({ ids }: PendingApprovalRequestsProps) {
  const { t } = useLanguage();

  const uniqueIds = useMemo(() => Array.from(new Set(ids)), [ids]);

  if (!uniqueIds.length) return null;

  return (
    <div className="mt-4 flex flex-col gap-4 w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {t("chat.pendingSubmissions", { count: uniqueIds.length })}
        </h3>
      </div>
      <div className="flex flex-col gap-4">
        {uniqueIds.map((id) => (
          <ApprovalRequestCard
            key={id}
            approvalRequestId={id}
            className="w-full"
          />
        ))}
      </div>
    </div>
  );
}
