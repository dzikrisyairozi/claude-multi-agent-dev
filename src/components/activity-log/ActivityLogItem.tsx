"use client";

import { Calendar, Clock } from "lucide-react";
import { ActivityLogRecord, ActivityAction } from "@/types/activityLog";
import { ActivityIcon } from "./ActivityIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLanguage, TranslationKey } from "@/providers/LanguageProvider";

type ActivityLogItemProps = {
  log: ActivityLogRecord;
};

const ACTION_TITLE_KEYS: Record<ActivityAction, TranslationKey> = {
  file_upload: "actionTitle.file_upload",
  file_delete: "actionTitle.file_delete",
  file_rename: "actionTitle.file_rename",
  file_move: "actionTitle.file_move",
  file_share: "actionTitle.file_share",
  folder_create: "actionTitle.folder_create",
  folder_rename: "actionTitle.folder_rename",
  folder_delete: "actionTitle.folder_delete",
  folder_move: "actionTitle.folder_move",
  bulk_move: "actionTitle.bulk_move",
  rag_ingest: "actionTitle.rag_ingest",
  thread_create: "actionTitle.thread_create",
  message_insert: "actionTitle.message_insert",
  user_invite: "actionTitle.user_invite",
  user_approve: "actionTitle.user_approve",
  user_reject: "actionTitle.user_reject",
  user_role_change: "actionTitle.user_role_change",
  user_delete: "actionTitle.user_delete",
  submission_approve: "actionTitle.submission_approve",
  submission_reject: "actionTitle.submission_reject",
  submission_need_revision: "actionTitle.submission_need_revision",
  submission_step_approve: "actionTitle.submission_step_approve",
  submission_step_reject: "actionTitle.submission_step_reject",
  approval_route_create: "actionTitle.approval_route_create",
  approval_route_update: "actionTitle.approval_route_update",
  approval_route_delete: "actionTitle.approval_route_delete",
  department_create: "actionTitle.department_create",
  department_update: "actionTitle.department_update",
  department_delete: "actionTitle.department_delete",
  position_create: "actionTitle.position_create",
  position_update: "actionTitle.position_update",
  position_delete: "actionTitle.position_delete",
  permission_update: "actionTitle.permission_update",
  submission_resubmit: "actionTitle.submission_resubmit",
  submission_comment: "actionTitle.submission_comment",
  submission_proxy_approve: "actionTitle.submission_proxy_approve",
  submission_reassign_approver: "actionTitle.submission_reassign_approver",
  knowledge_entry_create: "actionTitle.knowledge_entry_create",
  knowledge_entry_update: "actionTitle.knowledge_entry_update",
  knowledge_entry_delete: "actionTitle.knowledge_entry_delete",
};

function getRoleBadgeVariant(role: string | null | undefined) {
  switch (role) {
    case "platform_admin":
      return "bg-red-100 text-red-700 border-red-200";
    case "admin":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "approver":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "requester":
      return "bg-green-100 text-green-700 border-green-200";
    case "accounting":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return "User";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getRowBackground(action: ActivityAction): string {
  switch (action) {
    case "file_upload":
    case "folder_create":
      return "bg-orange-50/50";
    case "user_approve":
    case "submission_approve":
      return "bg-green-50/50";
    case "user_reject":
    case "submission_reject":
      return "bg-red-50/50";
    default:
      return "";
  }
}

function getActorInitials(actor: ActivityLogRecord["actor"]): string {
  if (!actor) return "U";
  const first = actor.first_name?.[0] || "";
  const last = actor.last_name?.[0] || "";
  return (first + last).toUpperCase() || actor.email?.[0]?.toUpperCase() || "U";
}

function getActorName(actor: ActivityLogRecord["actor"]): string {
  if (!actor) return "Unknown User";
  if (actor.first_name || actor.last_name) {
    return `${actor.first_name || ""} ${actor.last_name || ""}`.trim();
  }
  return actor.email || "Unknown User";
}

const LOCALE_MAP = { en: "en-US", ja: "ja-JP" } as const;

function formatDate(dateString: string, lang: "en" | "ja"): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(LOCALE_MAP[lang], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string, lang: "en" | "ja"): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString(LOCALE_MAP[lang], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: lang === "en",
  });
}

export function ActivityLogItem({ log }: ActivityLogItemProps) {
  const { t, language } = useLanguage();
  const entityName = log.entity_name || "Unknown";
  const titleKey = ACTION_TITLE_KEYS[log.action] ?? ("actionTitle.unknown" as TranslationKey);
  const actionText = t(titleKey);
  const highlight =
    log.action === "bulk_move"
      ? `${entityName} ${t("actionTitle.items")}`
      : entityName;
  const rowBg = getRowBackground(log.action);

  return (
    <div className={`flex gap-4 p-4 border-b last:border-b-0 ${rowBg}`}>
      {/* Action Icon */}
      <ActivityIcon action={log.action} />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Action Title */}
        <div className="font-medium text-foreground">
          {actionText} - <span className="text-primary">{highlight}</span>
        </div>

        {/* Role Change Details */}
        {log.action === "user_role_change" && log.old_values && log.new_values && (
          <div className="flex items-center gap-2 text-sm">
            <Badge
              variant="outline"
              className={getRoleBadgeVariant(log.old_values.role as string)}
            >
              {formatRoleLabel(log.old_values.role as string)}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge
              variant="outline"
              className={getRoleBadgeVariant(log.new_values.role as string)}
            >
              {formatRoleLabel(log.new_values.role as string)}
            </Badge>
          </div>
        )}

        {/* Actor Info */}
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={log.actor?.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-muted">
              {getActorInitials(log.actor)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{getActorName(log.actor)}</span>
          <Badge variant="outline" className={getRoleBadgeVariant(log.actor?.role)}>
            {formatRoleLabel(log.actor?.role)}
          </Badge>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDate(log.created_at, language)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(log.created_at, language)}
          </div>
        </div>
      </div>
    </div>
  );
}
