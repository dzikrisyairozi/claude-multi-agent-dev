import { CheckCircle2, Clock, XCircle, SkipForward, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";
import { ApprovalRequestStepApproval } from "@/types/approvalRequest";

type ApprovalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "need_revision"
  | "cancelled";

interface ApprovalStep {
  id: string;
  title: string;
  status: "completed" | "pending" | "rejected" | "skipped" | "need_revision";
  subtitle: string;
  actorName?: string;
}

interface ApprovalRouteTimelineProps {
  status?: ApprovalStatus;
  steps?: ApprovalStep[];
  stepApprovals?: ApprovalRequestStepApproval[];
  revisionSourceStepOrder?: number | null;
  revisionRestartFromFirst?: boolean | null;
}

const getStepsForStatus = (
  status: ApprovalStatus,
  t: TranslationFn,
): ApprovalStep[] => {
  const requesterStep: ApprovalStep = {
    id: "requester",
    title: t("timeline.step.requester"),
    status: "completed",
    subtitle: t("timeline.status.completed"),
  };

  const approverStep: ApprovalStep = {
    id: "approver",
    title: t("timeline.step.approver"),
    status: "pending",
    subtitle: t("timeline.status.pending"),
  };

  const accountingStep: ApprovalStep = {
    id: "accounting",
    title: t("timeline.step.accounting"),
    status: "pending",
    subtitle: t("timeline.status.pending"),
  };

  switch (status) {
    case "draft":
      return [
        { ...requesterStep, status: "pending", subtitle: t("timeline.status.draft") },
        approverStep,
        accountingStep,
      ];

    case "pending":
      return [requesterStep, approverStep, accountingStep];

    case "approved":
      return [
        requesterStep,
        {
          ...approverStep,
          status: "completed",
          subtitle: t("timeline.status.completed"),
        },
        {
          ...accountingStep,
          status: "completed",
          subtitle: t("timeline.status.completed"),
        },
      ];

    case "rejected":
      return [
        requesterStep,
        {
          ...approverStep,
          status: "rejected",
          subtitle: t("timeline.status.rejected"),
        },
        accountingStep,
      ];

    case "need_revision":
      return [
        requesterStep,
        {
          ...approverStep,
          status: "completed",
          subtitle: t("timeline.status.needRevision"),
        },
        accountingStep,
      ];

    case "cancelled":
      return [
        {
          ...requesterStep,
          status: "completed",
          subtitle: t("timeline.status.cancelled"),
        },
        approverStep,
        accountingStep,
      ];

    default:
      return [requesterStep, approverStep, accountingStep];
  }
};

/**
 * Convert step approval records into timeline display steps.
 * When revision is active, marks the source step with "need_revision" status.
 */
const getStepsFromApprovals = (
  stepApprovals: ApprovalRequestStepApproval[],
  requestStatus: ApprovalStatus,
  t: TranslationFn,
  revisionSourceStepOrder?: number | null,
): ApprovalStep[] => {
  const requesterStep: ApprovalStep = {
    id: "requester",
    title: t("timeline.step.requester"),
    status: requestStatus === "draft" ? "pending" : "completed",
    subtitle:
      requestStatus === "draft"
        ? t("timeline.status.draft")
        : t("timeline.status.completed"),
  };

  const dynamicSteps: ApprovalStep[] = stepApprovals.map((sa) => {
    // If this step is the revision source, mark it specially
    if (
      requestStatus === "need_revision" &&
      revisionSourceStepOrder &&
      sa.step_order === revisionSourceStepOrder
    ) {
      const actorName = sa.actor
        ? `${sa.actor.first_name || ""} ${sa.actor.last_name || ""}`.trim()
        : undefined;
      return {
        id: sa.id,
        title: sa.step_name,
        status: "need_revision" as const,
        subtitle: t("timeline.status.needRevisionSource"),
        actorName,
      };
    }

    let displayStatus: "completed" | "pending" | "rejected" | "skipped";
    let subtitle: string;
    let actorName: string | undefined;

    switch (sa.status) {
      case "approved":
        displayStatus = "completed";
        subtitle = t("timeline.status.completed");
        actorName = sa.actor
          ? `${sa.actor.first_name || ""} ${sa.actor.last_name || ""}`.trim()
          : undefined;
        break;
      case "rejected":
        displayStatus = "rejected";
        subtitle = t("timeline.status.rejected");
        actorName = sa.actor
          ? `${sa.actor.first_name || ""} ${sa.actor.last_name || ""}`.trim()
          : undefined;
        break;
      case "skipped":
        displayStatus = "skipped";
        subtitle = t("timeline.status.skipped");
        break;
      default:
        displayStatus = "pending";
        subtitle = t("timeline.status.pending");
        if (sa.assignees && sa.assignees.length > 0) {
          const firstAssignee = sa.assignees[0];
          actorName = firstAssignee.user
            ? `${firstAssignee.user.first_name || ""} ${firstAssignee.user.last_name || ""}`.trim()
            : undefined;
        }
        break;
    }

    return {
      id: sa.id,
      title: sa.step_name,
      status: displayStatus,
      subtitle,
      actorName,
    };
  });

  return [requesterStep, ...dynamicSteps];
};

/**
 * Get the display color variant for a step based on its status and whether it's the current step.
 */
function getStepColors(step: ApprovalStep, isCurrent: boolean) {
  if (step.status === "completed") {
    return {
      circleBg: "bg-sky-50",
      iconColor: "text-sky-500",
      titleColor: "text-sky-500",
      subtitleColor: "text-sky-400",
    };
  }
  if (step.status === "need_revision") {
    return {
      circleBg: "bg-red-50",
      iconColor: "text-red-500",
      titleColor: "text-red-500",
      subtitleColor: "text-red-400",
    };
  }
  if (step.status === "rejected") {
    return {
      circleBg: "bg-red-50",
      iconColor: "text-red-500",
      titleColor: "text-red-500",
      subtitleColor: "text-red-400",
    };
  }
  if (step.status === "skipped") {
    return {
      circleBg: "bg-amber-50",
      iconColor: "text-amber-500",
      titleColor: "text-amber-500",
      subtitleColor: "text-amber-400",
    };
  }
  // pending
  if (isCurrent) {
    return {
      circleBg: "bg-amber-50",
      iconColor: "text-amber-500",
      titleColor: "text-amber-500",
      subtitleColor: "text-amber-400",
    };
  }
  return {
    circleBg: "bg-slate-50",
    iconColor: "text-slate-300",
    titleColor: "text-slate-300",
    subtitleColor: "text-slate-300",
  };
}

function getStepIcon(step: ApprovalStep) {
  switch (step.status) {
    case "completed":
      return CheckCircle2;
    case "need_revision":
      return AlertTriangle;
    case "rejected":
      return XCircle;
    case "skipped":
      return SkipForward;
    default:
      return Clock;
  }
}

/**
 * Determine the connecting line color between two steps.
 * Red lines show the revision scope.
 */
function getLineColor(
  prevStep: ApprovalStep,
  currentStep: ApprovalStep,
  currentIndex: number,
  revisionSourceStepOrder: number | null | undefined,
  revisionRestartFromFirst: boolean | null | undefined,
  requestStatus: ApprovalStatus,
): string {
  // Show red lines only when status is need_revision and we have revision info
  if (requestStatus === "need_revision" && revisionSourceStepOrder) {
    // currentIndex is the step index in the array (0 = requester, 1 = step 1, etc.)
    // revisionSourceStepOrder is the step_order value (1-based, excluding requester)
    const sourceIndex = revisionSourceStepOrder; // index in array = step_order (since requester is index 0)

    if (revisionRestartFromFirst) {
      // Mode B: Red lines from source step backward to step 1 (index 1)
      // Red line if currentIndex is between 1 and sourceIndex (inclusive)
      if (currentIndex >= 1 && currentIndex <= sourceIndex) {
        return "bg-red-300";
      }
    } else {
      // Mode A: Red line only on the line leading to the source step
      if (currentIndex === sourceIndex) {
        return "bg-red-300";
      }
    }
  }

  // Default: blue if previous step completed, otherwise gray
  if (prevStep.status === "completed") {
    return "bg-sky-300";
  }
  return "bg-slate-200";
}

export function ApprovalRouteTimeline({
  status = "pending",
  steps,
  stepApprovals,
  revisionSourceStepOrder,
  revisionRestartFromFirst,
}: ApprovalRouteTimelineProps) {
  const { t } = useLanguage();

  // Priority: stepApprovals (dynamic) > steps (manual override) > hardcoded fallback
  const timelineSteps =
    stepApprovals && stepApprovals.length > 0
      ? getStepsFromApprovals(stepApprovals, status, t, revisionSourceStepOrder)
      : steps || getStepsForStatus(status, t);

  // Find the first pending step (the "current" step gets orange styling)
  const currentPendingIndex = timelineSteps.findIndex(
    (s) => s.status === "pending",
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-slate-700 font-bold text-lg">
          {t("timeline.title")}
        </h3>
        <p className="text-xs text-slate-400 font-medium">
          {t("timeline.description")}
        </p>
      </div>

      {/* Mobile: vertical layout */}
      <div className="flex flex-col md:hidden relative px-4 pt-4 gap-6">
        <div className="absolute top-8 left-10 bottom-4 w-px bg-slate-100 z-0" />
        {timelineSteps.map((step, index) => {
          const isCurrent = index === currentPendingIndex;
          const colors = getStepColors(step, isCurrent);
          const Icon = getStepIcon(step);
          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-row items-center gap-4"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  colors.circleBg,
                )}
              >
                <Icon className={cn("w-5 h-5", colors.iconColor)} />
              </div>
              <div className="space-y-0.5">
                <div className={cn("text-xs font-semibold", colors.titleColor)}>
                  {step.title}
                </div>
                {step.actorName && (
                  <div className="text-[10px] text-slate-400">
                    {step.actorName}
                  </div>
                )}
                <div
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-tight",
                    colors.subtitleColor,
                  )}
                >
                  {step.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal layout with connected nodes */}
      <div className="hidden md:block px-8 pt-4">
        {/* Top row: circles + connecting lines */}
        <div className="flex items-center">
          {timelineSteps.map((step, index) => {
            const isCurrent = index === currentPendingIndex;
            const colors = getStepColors(step, isCurrent);
            const Icon = getStepIcon(step);
            const prevStep = index > 0 ? timelineSteps[index - 1] : null;
            const lineColor = prevStep
              ? getLineColor(
                  prevStep,
                  step,
                  index,
                  revisionSourceStepOrder,
                  revisionRestartFromFirst,
                  status,
                )
              : "";

            return (
              <div key={step.id} className="contents">
                {/* Connecting line before this node (skip for first) */}
                {index > 0 && (
                  <div className={cn("flex-1 h-0.5", lineColor)} />
                )}
                {/* Circle node */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    colors.circleBg,
                  )}
                >
                  <Icon className={cn("w-5 h-5", colors.iconColor)} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom row: text labels aligned under each circle */}
        <div className="flex mt-2">
          {timelineSteps.map((step, index) => {
            const isCurrent = index === currentPendingIndex;
            const colors = getStepColors(step, isCurrent);

            return (
              <div key={step.id} className="contents">
                {/* Spacer to match connecting line width */}
                {index > 0 && <div className="flex-1" />}
                {/* Text block centered under circle */}
                <div className="w-10 shrink-0 flex flex-col items-center text-center">
                  <div
                    className={cn(
                      "text-xs font-semibold whitespace-nowrap",
                      colors.titleColor,
                    )}
                  >
                    {step.title}
                  </div>
                  {step.actorName && (
                    <div className="text-[10px] text-slate-400 whitespace-nowrap">
                      {step.actorName}
                    </div>
                  )}
                  <div
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-tight whitespace-nowrap",
                      colors.subtitleColor,
                    )}
                  >
                    {step.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
