export interface StepAssigneeSnapshot {
  user_id: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export interface ApprovalRequestStepApproval {
  id: string;
  approval_request_id: string;
  step_order: number;
  step_name: string;
  approver_role: string | null;
  approver_user_id: string | null;
  approver_position_id: string | null;
  approver_department_id: string | null;
  is_required: boolean;
  status: "pending" | "approved" | "rejected" | "skipped";
  acted_by: string | null;
  acted_at: string | null;
  notes: string | null;
  created_at: string;
  actor?: { first_name: string; last_name: string; email: string } | null;
  assignees?: StepAssigneeSnapshot[];
  proxy_approved_by: string | null;
  reassigned_from_user_id: string | null;
}

export interface ApprovalRequestItem {
  name: string;
  quantity: number;
  amount: number;
}

export interface ApprovalRequestDocument {
  id: string;
  approval_request_id: string;
  document_id: string | null;
  document_url: string | null;
  created_at: string;
  documents?: {
    file_name: string;
    file_size?: number;
    mime_type?: string;
  };
}

export interface ApprovalRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null; //Detailed Content, Reason for Purchase
  vendor_name: string | null;
  category: string | null;
  amount: number | null;
  priority: string | null;
  date: string | null;
  status: string;
  approval_notes: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  approver?: { first_name: string; last_name: string; email: string } | null;
  rejector?: { first_name: string; last_name: string; email: string } | null;
  submitter?: { first_name: string; last_name: string; email: string } | null;
  items: ApprovalRequestItem[];
  documents: ApprovalRequestDocument[];
  created_at: string;
  updated_at: string;
  department: string | null;
  is_use_tax: boolean | null;
  is_tax_included: boolean | null;
  tax_rate: number | null;
  payment_schedule_date: string | null;
  payment_method: string | null;
  reason_for_purchase: string | null;
  purpose: string | null;
  remarks: string | null;
  category_type_id: string | null;
  category_type?: { id: string; name: string; category: string } | null;
  route_id: string | null;
  current_step_order: number | null;
  step_approvals: ApprovalRequestStepApproval[];
  revision_source_step_order: number | null;
  revision_restart_from_first: boolean | null;
  is_escalated: boolean;
  escalated_at: string | null;
}

export interface CreateApprovalRequestParams {
  title: string;
  description?: string;
  vendor_name?: string;
  category?: string;
  amount?: number;
  priority?: string;
  date?: string;
  /** Array of document IDs to link */
  document_ids?: string[];
  /** Array of external document URLs to link */
  document_urls?: string[];
  items?: ApprovalRequestItem[];
  department?: string;
  is_use_tax?: boolean;
  is_tax_included?: boolean;
  tax_rate?: number;
  payment_schedule_date?: string;
  payment_method?: string;
  reason_for_purchase?: string;
  purpose?: string;
  remarks?: string;
  category_type_id?: string;
  status?: "draft" | "pending";
}

export interface UpdateApprovalRequestParams {
  id: string;
  title?: string;
  description?: string;
  vendor_name?: string;
  category?: string;
  amount?: number;
  priority?: string;
  date?: string;
  status?: string;
  approval_notes?: string;
  /** Array of document IDs to link (replaces existing) */
  document_ids?: string[];
  /** Array of external document URLs to link (replaces existing) */
  document_urls?: string[];
  items?: ApprovalRequestItem[];
  department?: string;
  is_use_tax?: boolean;
  is_tax_included?: boolean;
  tax_rate?: number;
  payment_schedule_date?: string;
  payment_method?: string;
  reason_for_purchase?: string;
  purpose?: string;
  remarks?: string;
  category_type_id?: string;
}

export interface GetApprovalRequestsParams {
  category?: string;
  priority?: string;
  status?: string;
  excludeDrafts?: boolean;
}
