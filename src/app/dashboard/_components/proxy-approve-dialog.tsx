"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/providers/LanguageProvider";
import { ApprovalRequest } from "@/types/approvalRequest";
import { proxyApproveSubmission } from "@/service/approvalRequest/escalation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ProxyApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ApprovalRequest;
  onSuccess?: () => void;
}

export function ProxyApproveDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: ProxyApproveDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [step, setStep] = useState<"comment" | "summary">("comment");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = request.step_approvals?.find(
    (s) => s.step_order === request.current_step_order
  );

  const originalAssigneeName = currentStep?.actor
    ? `${currentStep.actor.first_name || ""} ${currentStep.actor.last_name || ""}`.trim()
    : "Unknown";

  const performedByName = user
    ? `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim() || user.email || "Admin"
    : "Admin";

  const handleNext = () => {
    if (!comment.trim()) return;
    setStep("summary");
  };

  const handleBack = () => {
    setStep("comment");
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const result = await proxyApproveSubmission({
        requestId: request.id,
        comment: comment.trim(),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("escalation.proxyApprove.success"));
      setComment("");
      setStep("comment");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to proxy approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep("comment");
      setComment("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t("escalation.proxyApprove")}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("escalation.proxyApprove.actingOnBehalf", {
              name: originalAssigneeName,
            })}
          </p>
        </DialogHeader>

        {step === "comment" && (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="proxy-comment">
                {t("escalation.proxyApprove.comment")} *
              </Label>
              <Textarea
                id="proxy-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("escalation.proxyApprove.commentPlaceholder")}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                {t("escalation.back")}
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleNext}
                disabled={!comment.trim()}
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("escalation.summary.action")}
                </span>
                <span className="font-medium">
                  {t("escalation.proxyApprover")}
                </span>
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
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                {comment}
              </div>
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
