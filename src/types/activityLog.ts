import { LucideIcon } from "lucide-react";
import { TranslationKey } from "@/providers/LanguageProvider";

export type DateRange = "7days" | "30days" | "90days" | "all";

export type ActivityAction =
  | "file_upload"
  | "file_delete"
  | "file_rename"
  | "file_move"
  | "file_share"
  | "folder_create"
  | "folder_rename"
  | "folder_delete"
  | "folder_move"
  | "bulk_move"
  | "rag_ingest"
  | "thread_create"
  | "message_insert"
  | "user_invite"
  | "user_approve"
  | "user_reject"
  | "user_role_change"
  | "user_delete"
  | "submission_approve"
  | "submission_reject"
  | "submission_need_revision"
  | "submission_step_approve"
  | "submission_step_reject"
  | "approval_route_create"
  | "approval_route_update"
  | "approval_route_delete"
  | "department_create"
  | "department_update"
  | "department_delete"
  | "position_create"
  | "position_update"
  | "position_delete"
  | "permission_update"
  | "submission_resubmit"
  | "submission_comment"
  | "submission_proxy_approve"
  | "submission_reassign_approver"
  | "knowledge_entry_create"
  | "knowledge_entry_update"
  | "knowledge_entry_delete";

export type ActivityEntityType =
  | "file"
  | "folder"
  | "thread"
  | "message"
  | "bulk"
  | "user"
  | "submission"
  | "approval_route"
  | "department"
  | "position"
  | "permission"
  | "knowledge_entry";

export interface ActivityActor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url?: string | null;
}

export interface ActivityLogRecord {
  id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  entity_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: ActivityActor;
}

export interface CreateActivityLogPayload {
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id?: string | null;
  entity_name?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogFilters {
  action?: ActivityAction;
  entity_type?: ActivityEntityType;
  entity_id?: string;
  user_id?: string;
  user_ids?: string[];
  from_date?: string;
  to_date?: string;
  search?: string;
}

export interface ActivityStats {
  users_approved: number;
  users_rejected: number;
  files_uploaded: number;
  files_deleted: number;
  files_shared: number;
  submissions_approved: number;
  submissions_rejected: number;
  submissions_pending: number;
  submissions_need_revision: number;
  total_form_submissions: number;
}

export interface StatCardConfig {
  key: keyof ActivityStats;
  labelKey: TranslationKey;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
}

export interface ActionFilterOption {
  value: ActivityAction;
  labelKey: TranslationKey;
  icon: LucideIcon;
  className?: string;
}

export type StatCategory = "submissions" | "users" | "files";

export interface StatCategoryConfig {
  category: StatCategory;
  labelKey: TranslationKey;
  cards: StatCardConfig[];
}

export interface ActivityLogPageConfig {
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  statCategories: StatCategoryConfig[];
  defaultVisibleStats: Array<keyof ActivityStats>;
}
