"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/providers/LanguageProvider";
import { ApprovalRequest } from "@/types/approvalRequest";
import { AvailableApprover } from "@/types/escalation";
import {
  reassignApprover,
  getAvailableApprovers,
} from "@/service/approvalRequest/escalation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ReassignApproverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ApprovalRequest;
  onSuccess?: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  platform_admin: "bg-red-100 text-red-700",
  approver: "bg-green-100 text-green-700",
  accounting: "bg-orange-100 text-orange-700",
  requester: "bg-blue-100 text-blue-700",
};

export function ReassignApproverDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: ReassignApproverDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "reason" | "summary">("select");
  const [approvers, setApprovers] = useState<AvailableApprover[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = request.step_approvals?.find(
    (s) => s.step_order === request.current_step_order
  );

  const selectedApprover = approvers.find((a) => a.id === selectedUserId);

  const originalAssigneeName = currentStep?.actor
    ? `${currentStep.actor.first_name || ""} ${currentStep.actor.last_name || ""}`.trim()
    : "Unknown";

  const performedByName = user
    ? `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim() || user.email || "Admin"
    : "Admin";

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getAvailableApprovers(request.id)
        .then((result) => {
          if (result.data) setApprovers(result.data);
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, request.id]);

  const handleNext = () => {
    if (step === "select" && selectedUserId) {
      setStep("reason");
    } else if (step === "reason" && reason.trim()) {
      setStep("summary");
    }
  };

  const handleBack = () => {
    if (step === "reason") setStep("select");
    else if (step === "summary") setStep("reason");
  };

  const handleConfirm = async () => {
    if (!selectedUserId) return;
    setIsSubmitting(true);
    try {
      const result = await reassignApprover({
        requestId: request.id,
        newUserId: selectedUserId,
        reason: reason.trim(),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("escalation.reassign.success"));
      resetState();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to reassign approver");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep("select");
    setSelectedUserId(null);
    setReason("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t("escalation.reassignApprover")}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("escalation.reassign.replaceAt", {
              name: originalAssigneeName,
              step: `Stage ${currentStep?.step_order} — ${currentStep?.step_name}`,
            })}
          </p>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4 mt-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading...
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {approvers.map((approver) => (
                  <label
                    key={approver.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUserId === approver.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {(approver.firstName?.[0] || "?").toUpperCase()}
                        {(approver.lastName?.[0] || "").toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {approver.firstName} {approver.lastName}
                          </span>
                          {approver.role && (
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${
                                ROLE_COLORS[approver.role] ||
                                "bg-gray-100 text-gray-700"
                              } border-none`}
                            >
                              {approver.role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {approver.pendingCount} {t("escalation.reassign.pendingSubmission")}
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="approver"
                      checked={selectedUserId === approver.id}
                      onChange={() => setSelectedUserId(approver.id)}
                      className="w-4 h-4 text-primary"
                    />
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                {t("escalation.cancel")}
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleNext}
                disabled={!selectedUserId}
              >
                {t("escalation.continue")}
              </Button>
            </div>
          </div>
        )}

        {step === "reason" && (
          <div className="space-y-4 mt-2">
            {selectedApprover && (
              <div>
                <p className="text-sm font-medium text-primary mb-2">
                  {t("escalation.reassign.newAssignee")}
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                    {(selectedApprover.firstName?.[0] || "?").toUpperCase()}
                    {(selectedApprover.lastName?.[0] || "").toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {selectedApprover.firstName} {selectedApprover.lastName}
                  </span>
                  {selectedApprover.role && (
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${
                        ROLE_COLORS[selectedApprover.role] ||
                        "bg-gray-100 text-gray-700"
                      } border-none`}
                    >
                      {selectedApprover.role}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reassign-reason">
                {t("escalation.reassign.reason")} *
              </Label>
              <Textarea
                id="reassign-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("escalation.reassign.reasonPlaceholder")}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBack}
              >
                {t("escalation.back")}
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleNext}
                disabled={!reason.trim()}
              >
                {t("escalation.next")}
              </Button>
            </div>
          </div>
        )}

        {step === "summary" && (
          <div className="space-y-4 mt-2">
            <h3 className="font-semibold">{t("escalation.summary")}</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("escalation.summary.submissionTitle")}
                </span>
                <span className="font-medium text-right max-w-[250px] truncate">
                  {request.title}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {t("escalation.summary.action")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <p className="text-xs text-red-500 font-medium">
                      {t("escalation.reassign.removing")}
                    </p>
                    <p className="text-sm">{originalAssigneeName}</p>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="text-center">
                    <p className="text-xs text-primary font-medium">
                      {t("escalation.reassign.assigning")}
                    </p>
                    <p className="text-sm">
                      {selectedApprover?.firstName} {selectedApprover?.lastName}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("escalation.summary.stage")}
                </span>
                <span className="font-medium">
                  Stage {currentStep?.step_order} — {currentStep?.step_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("escalation.summary.performedBy")}
                </span>
                <span className="font-medium">{performedByName}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">
                {t("escalation.summary.comment")}
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">{reason}</div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                {t("escalation.back")}
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? "..." : t("escalation.confirm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
