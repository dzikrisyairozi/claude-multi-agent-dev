export type NotificationType =
  | "approval_submitted"
  | "approval_approved"
  | "approval_rejected"
  | "approval_need_revision"
  | "comment_added"
  | "escalation_timeout"
  | "proxy_delegated";

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  approval_request_id: string | null;
  is_read: boolean;
  read_at: string | null;
  requires_action: boolean;
  action_completed_at: string | null;
  step_order: number | null;
  created_at: string;
}

export interface CreateNotificationPayload {
  recipient_id: string;
  actor_id?: string;
  type: NotificationType;
  title: string;
  message?: string;
  approval_request_id?: string;
  requires_action?: boolean;
  step_order?: number;
}
