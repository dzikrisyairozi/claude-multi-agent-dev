"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { ApprovalRequest } from "@/types/approvalRequest";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ProxyApproveDialog } from "./proxy-approve-dialog";
import { ReassignApproverDialog } from "./reassign-approver-dialog";

interface TakeActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ApprovalRequest;
  onSuccess?: () => void;
}

export function TakeActionDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: TakeActionDialogProps) {
  const { t } = useLanguage();
  const [proxyOpen, setProxyOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const currentStep = request.step_approvals?.find(
    (s) => s.step_order === request.current_step_order
  );

  const handleProxyApprove = () => {
    onOpenChange(false);
    setProxyOpen(true);
  };

  const handleReassign = () => {
    onOpenChange(false);
    setReassignOpen(true);
  };

  const handleSuccess = () => {
    setProxyOpen(false);
    setReassignOpen(false);
    onSuccess?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {t("escalation.takeAction.title")}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("escalation.timeoutMessage", {
                title: request.title,
                step: request.current_step_order || 1,
              })}
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Submission Summary */}
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {request.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-sm font-semibold">
                  {request.amount ? formatCurrency(request.amount) : "-"}
                </span>
              </div>
              <p className="text-sm text-foreground">{request.title}</p>
              {request.category && (
                <Badge variant="secondary" className="text-xs">
                  {request.category}
                </Badge>
              )}
            </div>

            {/* Original Assignee */}
            {currentStep && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("escalation.originalAssignee")}
                </p>
                <div className="flex items-center gap-3 border rounded-lg p-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                    {currentStep.actor?.first_name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {currentStep.actor?.first_name || "Unknown"}{" "}
                      {currentStep.actor?.last_name || ""}
                    </p>
                    {request.escalated_at && (
                      <p className="text-xs text-red-500">
                        {t("escalation.noActionSince")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("escalation.takeAction.chooseAction")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleProxyApprove}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-sm">
                    {t("escalation.proxyApprove")}
                  </span>
                  <span className="text-xs opacity-90">
                    {t("escalation.proxyApprove.desc")}
                  </span>
                </button>
                <button
                  onClick={handleReassign}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-sm">
                    {t("escalation.reassignApprover")}
                  </span>
                  <span className="text-xs opacity-90">
                    {t("escalation.reassignApprover.desc")}
                  </span>
                </button>
              </div>
            </div>

            {/* View Details Link */}
            <Link
              href={`/approval-requests/${request.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              {t("escalation.viewSubmissionDetail")}
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <ProxyApproveDialog
        open={proxyOpen}
        onOpenChange={setProxyOpen}
        request={request}
        onSuccess={handleSuccess}
      />

      <ReassignApproverDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        request={request}
        onSuccess={handleSuccess}
      />
    </>
  );
}
