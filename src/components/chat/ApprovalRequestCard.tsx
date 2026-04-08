"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getApprovalRequest } from "@/service/approvalRequest/approvalRequest";
import { ApprovalRequestCard as SharedApprovalRequestCard } from "@/components/approval-request/ApprovalRequestCard";

import { cn } from "@/lib/utils";

interface ApprovalRequestCardProps {
  approvalRequestId: string;
  className?: string;
}

export function ApprovalRequestCard({
  approvalRequestId,
  className,
}: ApprovalRequestCardProps) {
  const {
    data: result,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["approvalRequest", approvalRequestId],
    queryFn: () => getApprovalRequest(approvalRequestId),
    enabled: !!approvalRequestId,
  });

  if (isLoading) {
    return (
      <Card
        className={cn(
          "w-full max-w-lg border-l-4 border-l-amber-400 bg-white",
          className
        )}
      >
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  // Handle both network errors and API-level errors returned in the result object
  const errorMessage = error?.message || result?.error;
  const requestData = result?.data;

  if (errorMessage || !requestData) {
    return (
      <Card
        className={cn(
          "w-full max-w-lg border-l-4 border-l-red-400 bg-white",
          className
        )}
      >
        <CardContent className="p-6">
          <p className="text-red-500 text-sm">
            {errorMessage || "Approval request not found"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full max-w-2xl", className)}>
      <SharedApprovalRequestCard request={requestData} onUpdate={refetch} />
    </div>
  );
}
