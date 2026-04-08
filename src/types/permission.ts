import { UserRole } from "./user";

export type PermissionValue =
  | "granted"
  | "denied"
  | "assigned_only"
  | "limited"
  | "view_only";

export type PermissionCategory =
  | "submission"
  | "approval"
  | "route_config"
  | "reports"
  | "system";

export type PermissionAction =
  // Submission
  | "create_submit_ringi"
  | "save_draft"
  | "edit_own_draft"
  | "view_all_submissions"
  | "view_assigned_submissions"
  | "track_submission_status"
  // Approval Actions
  | "approve_ringi"
  | "send_revision"
  | "reject_ringi"
  | "bulk_approve"
  | "proxy_approve"
  | "cancel_approval"
  | "convert_rejection_to_remand"
  | "add_comments"
  // Approval Route Configuration
  | "create_edit_routes"
  | "view_route_config"
  | "configure_conditional_routing"
  | "set_escalation_timeout"
  | "set_proxy_approver"
  // Reports & Audit
  | "view_lead_time_report"
  | "view_sendback_rate_report"
  | "export_audit_log"
  // System Configuration
  | "manage_members"
  | "manage_roles_permissions"
  | "configure_expense_categories"
  | "configure_submission_restrictions"
  | "manage_notification_settings";

export interface Permission {
  id: string;
  code: PermissionAction;
  category: PermissionCategory;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permission_id: string;
  permission: PermissionValue;
  created_at: string;
  updated_at: string;
  // Joined fields
  permissions?: Permission;
}

export interface UpdateRolePermissionParams {
  role: UserRole;
  permissionId: string;
  permission: PermissionValue;
}

export interface PermissionMatrixRow {
  action: PermissionAction;
  category: PermissionCategory;
  name: string;
  description: string | null;
  permissionId: string;
  values: Record<string, PermissionValue>;
}
