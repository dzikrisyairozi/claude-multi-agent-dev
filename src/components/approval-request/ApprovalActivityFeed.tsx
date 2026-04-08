"use client";

import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";
import { ActivityLogRecord } from "@/types/activityLog";
import {
  ApprovalRequest,
  ApprovalRequestStepApproval,
} from "@/types/approvalRequest";

// ────────────────────────────────────────────────────────────
// Unified timeline item (merged from step_approvals + activity_logs)
// ────────────────────────────────────────────────────────────

interface TimelineItem {
  id: string;
  stepName: string;
  status: "completed" | "sent_back" | "rejected" | "pending";
  actorName: string;
  date: string | null; // ISO string
  comment: string | null;
  fieldChanges: { field: string; oldValue: string; newValue: string }[] | null;
}

interface ApprovalActivityFeedProps {
  request: ApprovalRequest;
  logs: ActivityLogRecord[];
  isLoading?: boolean;
}

// ────────────────────────────────────────────────────────────
// Build timeline items from step_approvals + activity_logs
// ────────────────────────────────────────────────────────────

function buildTimeline(
  request: ApprovalRequest,
  logs: ActivityLogRecord[],
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // 1. Requester entry (always present for non-draft submissions)
  if (request.status !== "draft") {
    const submitterName = request.submitter
      ? `${request.submitter.first_name || ""} ${request.submitter.last_name || ""}`.trim()
      : "";
    items.push({
      id: "requester-initial",
      stepName: "Requester",
      status: "completed",
      actorName: submitterName || "Requester",
      date: request.created_at,
      comment: null,
      fieldChanges: null,
    });
  }

  // 2. Build from activity logs (chronological history) + step_approvals for current state
  // Activity logs capture historical actions — use them if available
  if (logs.length > 0) {
    // Build a map of step_approval notes/acted info for enrichment
    const stepByOrder = new Map<number, ApprovalRequestStepApproval>();
    for (const sa of request.step_approvals || []) {
      stepByOrder.set(sa.step_order, sa);
    }

    for (const log of logs) {
      const meta = log.metadata as Record<string, unknown> | null;
      const newVals = log.new_values as Record<string, unknown> | null;
      const stepName =
        (meta?.step_name as string) ||
        (newVals?.step_name as string) ||
        getStepLabelFromAction(log.action);
      const actorName = getActorNameFromLog(log);

      let status: TimelineItem["status"];
      switch (log.action) {
        case "submission_approve":
        case "submission_step_approve":
        case "submission_resubmit":
          status = "completed";
          break;
        case "submission_reject":
        case "submission_step_reject":
          status = "rejected";
          break;
        case "submission_need_revision":
          status = "sent_back";
          break;
        case "submission_comment":
          status = "completed";
          break;
        default:
          status = "completed";
      }

      items.push({
        id: log.id,
        stepName,
        status,
        actorName,
        date: log.created_at,
        comment: extractComment(log),
        fieldChanges: extractFieldChanges(log),
      });
    }
  } else {
    // No activity logs — build from step_approvals that have been acted on
    for (const sa of request.step_approvals || []) {
      if (sa.acted_at && sa.status !== "pending") {
        const actorName = sa.actor
          ? `${sa.actor.first_name || ""} ${sa.actor.last_name || ""}`.trim()
          : "";
        items.push({
          id: sa.id,
          stepName: sa.step_name,
          status:
            sa.status === "approved"
              ? "completed"
              : sa.status === "rejected"
                ? "rejected"
                : "completed",
          actorName: actorName || sa.step_name,
          date: sa.acted_at,
          comment: sa.notes,
          fieldChanges: null,
        });
      }
    }
  }

  // 3. Current pending step (if request is pending)
  if (request.status === "pending") {
    // Use current_step_order to find the correct pending step (not just the first one)
    const pendingStep = request.current_step_order
      ? (request.step_approvals || []).find(
          (sa) => sa.step_order === request.current_step_order,
        )
      : (request.step_approvals || []).find(
          (sa) => sa.status === "pending",
        );
    if (pendingStep) {
      const assigneeName = pendingStep.assignees?.[0]?.user
        ? `${pendingStep.assignees[0].user.first_name || ""} ${pendingStep.assignees[0].user.last_name || ""}`.trim()
        : "";
      items.push({
        id: `pending-${pendingStep.id}`,
        stepName: pendingStep.step_name,
        status: "pending",
        actorName: assigneeName || pendingStep.step_name,
        date: null,
        comment: null,
        fieldChanges: null,
      });
    }
  }

  return items;
}

function getStepLabelFromAction(action: string): string {
  switch (action) {
    case "submission_approve":
    case "submission_step_approve":
    case "submission_reject":
    case "submission_step_reject":
    case "submission_need_revision":
      return "Approver";
    case "submission_resubmit":
      return "Requester";
    case "submission_comment":
      return "Comment";
    default:
      return "Requester";
  }
}

function getActorNameFromLog(log: ActivityLogRecord): string {
  if (log.actor) {
    const name =
      `${log.actor.first_name || ""} ${log.actor.last_name || ""}`.trim();
    if (name) return name;
  }
  return "Unknown";
}

function extractComment(log: ActivityLogRecord): string | null {
  const meta = log.metadata as Record<string, unknown> | null;
  if (meta?.notes && typeof meta.notes === "string") return meta.notes;
  const newVals = log.new_values as Record<string, unknown> | null;
  if (newVals?.approval_notes && typeof newVals.approval_notes === "string") {
    return newVals.approval_notes;
  }
  return null;
}

function extractFieldChanges(
  log: ActivityLogRecord,
): { field: string; oldValue: string; newValue: string }[] | null {
  if (!log.old_values || !log.new_values) return null;

  const old = log.old_values as Record<string, unknown>;
  const cur = log.new_values as Record<string, unknown>;

  const skipKeys = new Set([
    "approval_notes",
    "status",
    "approved_by",
    "rejected_by",
    "updated_at",
    "current_step_order",
    "step_order",
    "step_name",
  ]);

  const changes: { field: string; oldValue: string; newValue: string }[] = [];

  for (const key of Object.keys(cur)) {
    if (skipKeys.has(key)) continue;
    const oldVal = old[key];
    const newVal = cur[key];
    if (
      JSON.stringify(oldVal) !== JSON.stringify(newVal) &&
      oldVal !== undefined
    ) {
      changes.push({
        field: formatFieldName(key),
        oldValue: formatFieldValue(oldVal),
        newValue: formatFieldValue(newVal),
      });
    }
  }

  return changes.length > 0 ? changes : null;
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") return val.toLocaleString();
  return String(val);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ────────────────────────────────────────────────────────────
// Style configs per timeline item status
// ────────────────────────────────────────────────────────────

function getItemConfig(status: TimelineItem["status"]) {
  switch (status) {
    case "completed":
      return {
        iconBg: "bg-sky-50",
        iconColor: "text-sky-500",
        Icon: CheckCircle2,
        labelColor: "text-sky-500",
        bubbleBg: "bg-sky-50",
        bubbleIcon: "text-sky-500",
        statusLabel: "COMPLETED",
      };
    case "sent_back":
      return {
        iconBg: "bg-amber-50",
        iconColor: "text-amber-500",
        Icon: AlertTriangle,
        labelColor: "text-amber-500",
        bubbleBg: "bg-orange-50",
        bubbleIcon: "text-amber-500",
        statusLabel: "SENT BACK",
      };
    case "rejected":
      return {
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
        Icon: XCircle,
        labelColor: "text-red-500",
        bubbleBg: "bg-red-50",
        bubbleIcon: "text-red-500",
        statusLabel: "REJECTED",
      };
    case "pending":
      return {
        iconBg: "bg-amber-50",
        iconColor: "text-amber-500",
        Icon: Clock,
        labelColor: "text-amber-500",
        bubbleBg: "bg-slate-50",
        bubbleIcon: "text-slate-400",
        statusLabel: "PENDING",
      };
  }
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function ApprovalActivityFeed({
  request,
  logs,
  isLoading,
}: ApprovalActivityFeedProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-slate-700 font-bold text-lg">
          {t("timeline.activityLog.title")}
        </h3>
        <div className="flex items-center justify-center gap-3 text-slate-400 text-sm py-8">
          <Clock className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  const timeline = buildTimeline(request, logs);

  if (timeline.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-slate-700 font-bold text-lg">
          {t("timeline.activityLog.title")}
        </h3>
        <div className="text-center py-8 text-slate-400 text-sm">
          {t("timeline.activityLog.empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-slate-700 font-bold text-lg">
        {t("timeline.activityLog.title")}
      </h3>

      <div className="relative pl-5">
        {/* Vertical connecting line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

        <div className="space-y-10">
          {timeline.map((item, index) => (
            <TimelineItemRow
              key={item.id}
              item={item}
              isLast={index === timeline.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineItemRow({
  item,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const config = getItemConfig(item.status);

  return (
    <div className="relative">
      {/* Event header row */}
      <div className="flex items-start gap-3">
        {/* Circle icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative z-10",
            config.iconBg,
          )}
        >
          <config.Icon className={cn("w-5 h-5", config.iconColor)} />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          {/* Step name + status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-semibold", config.labelColor)}>
              {item.stepName}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-tight",
                config.labelColor,
              )}
            >
              {config.statusLabel}
            </span>
          </div>

          {/* Actor + date/time */}
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-2.5 h-2.5" />
              {item.actorName}
            </span>
            {item.date && (
              <>
                <span className="flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {formatDate(item.date)}
                </span>
                <span>{formatTime(item.date)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comment bubble */}
      {(item.comment || item.fieldChanges) && (
        <div
          className={cn("ml-[52px] mt-2 rounded-lg p-3 text-sm", config.bubbleBg)}
        >
          {/* Comment header (actor + datetime) */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <MessageSquare className={cn("w-3 h-3", config.bubbleIcon)} />
              <span className="text-xs font-medium text-slate-700">
                {item.actorName}
              </span>
            </div>
            {item.date && (
              <span className="text-[10px] text-slate-400">
                {formatDate(item.date)} {formatTime(item.date)}
              </span>
            )}
          </div>

          {/* Comment text */}
          {item.comment && (
            <p className="text-xs text-slate-700 leading-relaxed">
              {item.comment}
            </p>
          )}

          {/* Revision diffs */}
          {item.fieldChanges && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[10px] text-slate-500">
                Changes in this revision
              </p>
              {item.fieldChanges.map((change) => (
                <div key={change.field} className="space-y-0.5">
                  <p className="text-[10px] font-medium text-slate-700">
                    {change.field}
                  </p>
                  <div className="inline-flex items-center gap-1.5 bg-white rounded px-2 py-1">
                    <span className="text-[10px] text-slate-400 line-through">
                      {change.oldValue}
                    </span>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="text-[10px] text-sky-500 font-medium">
                      {change.newValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
