"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateApprovalRequestStatus } from "@/service/approvalRequest/approvalRequest";
import { toast } from "sonner";
import { Loader2, XCircle, FileEdit, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";

interface ApprovalActionsProps {
  id: string;
  onSuccess?: () => void;
  buttonClassName?: string;
  className?: string;
  currentStepName?: string | null;
  currentStepOrder?: number | null;
  totalSteps?: number;
  hasRoute?: boolean;
}

export function ApprovalActions({
  id,
  onSuccess,
  buttonClassName,
  className,
  currentStepName,
  currentStepOrder,
  totalSteps,
  hasRoute,
}: ApprovalActionsProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "need_revision" | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [restartFromFirst, setRestartFromFirst] = useState(false);

  const handleAction = (type: "approve" | "reject" | "need_revision") => {
    setActionType(type);
    setNotes("");
    setRestartFromFirst(false);
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!actionType) return;

    if (
      (actionType === "reject" || actionType === "need_revision") &&
      !notes.trim()
    ) {
      toast.error(t("action.rejectReasonRequired"));
      return;
    }

    setIsLoading(true);
    try {
      const statusMap = {
        approve: "approved",
        reject: "rejected",
        need_revision: "need_revision",
      };
      const status = statusMap[actionType];
      const { error } = await updateApprovalRequestStatus(
        id,
        status,
        notes,
        actionType === "need_revision" ? restartFromFirst : undefined,
      );

      if (error) {
        toast.error(error);
      } else {
        const successMessages = {
          approve: t("action.approveSuccess"),
          reject: t("action.rejectSuccess"),
          need_revision: t("action.needRevisionSuccess"),
        };
        toast.success(successMessages[actionType]);
        setIsOpen(false);
        router.refresh();
        onSuccess?.();
      }
    } catch (error) {
      console.error(error);
      toast.error(t("generic.somethingWrong"));
    } finally {
      setIsLoading(false);
    }
  };

  const stepLabel =
    hasRoute && currentStepName && currentStepOrder && totalSteps
      ? `${t("action.step")} ${currentStepOrder}/${totalSteps}: ${currentStepName}`
      : null;

  const dialogTitles = {
    approve: t("action.approveRequest"),
    reject: t("action.rejectRequest"),
    need_revision: t("action.needRevisionRequest"),
  };

  const dialogDescriptions = {
    approve: t("action.approveConfirm"),
    reject: t("action.rejectConfirm"),
    need_revision: t("action.needRevisionConfirm"),
  };

  return (
    <>
      <div className={cn("flex flex-col gap-2", className)}>
        {stepLabel && (
          <p className="text-xs font-medium text-slate-500">{stepLabel}</p>
        )}
        <div className="flex flex-col md:flex-row gap-3 w-full">
          <Button
            variant="destructive"
            onClick={() => handleAction("reject")}
            className={cn("w-full md:w-auto", buttonClassName)}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            {t("action.reject")}
          </Button>
          {hasRoute && (
            <Button
              variant="outline"
              onClick={() => handleAction("need_revision")}
              className={cn(
                "w-full md:w-auto border-orange-300 bg-orange-400 text-white hover:bg-orange-500 hover:text-white",
                buttonClassName
              )}
            >
              <FileEdit className="w-4 h-4 mr-1.5" />
              {t("action.needRevision")}
            </Button>
          )}
          <Button
            variant="default"
            className={cn(
              "bg-emerald-500 hover:bg-emerald-600 text-white w-full md:w-auto",
              buttonClassName
            )}
            onClick={() => handleAction("approve")}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {t("action.approve")}
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType ? dialogTitles[actionType] : ""}
            </DialogTitle>
            <DialogDescription>
              {actionType ? dialogDescriptions[actionType] : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                {t("action.commentLabel")}{" "}
                {actionType === "approve" ? t("action.commentOptional") : ""}
              </label>
              <Textarea
                id="notes"
                placeholder={t("action.commentPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {actionType === "need_revision" && (totalSteps ?? 0) > 1 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restartFromFirst}
                    onChange={(e) => setRestartFromFirst(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("approval.needRevision.restartFromFirst")}
                  </span>
                </label>
              )}
              <p className="text-xs text-muted-foreground">
                {t("action.cannotUndo")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              {t("action.cancel")}
            </Button>
            <Button
              variant={
                actionType === "approve"
                  ? "default"
                  : actionType === "need_revision"
                    ? "outline"
                    : "destructive"
              }
              className={
                actionType === "approve"
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : actionType === "need_revision"
                    ? "border-orange-300 text-orange-600 hover:bg-orange-50"
                    : ""
              }
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "approve"
                ? t("action.approve")
                : actionType === "need_revision"
                  ? t("action.needRevision")
                  : t("action.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
