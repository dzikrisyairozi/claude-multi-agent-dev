export type ApprovalRouteCategory =
  | "purchasing"
  | "contracts"
  | "expenses"
  | "other";

export type ApprovalRouteApproverRole =
  | "approver"
  | "accounting"
  | "admin"
  | "platform_admin";

export interface ApprovalRouteCondition {
  min_amount?: number | null;
  min_amount_inclusive?: boolean;
  max_amount?: number | null;
  max_amount_inclusive?: boolean;
  departments?: string[];
  categories?: ApprovalRouteCategory[];
  category_type_ids?: string[];
}

export interface StepAssignee {
  user_id: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export interface ApprovalRouteStep {
  id: string;
  route_id: string;
  step_order: number;
  name: string;
  approver_role: ApprovalRouteApproverRole | null;
  approver_user_id: string | null;
  approver_position_id: string | null;
  approver_department_id: string | null;
  is_required: boolean;
  created_at: string;
  position?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  assignees?: StepAssignee[];
}

export interface ApprovalRoute {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  conditions: ApprovalRouteCondition;
  condition_logic: "and" | "or";
  weight: number;
  steps: ApprovalRouteStep[];
  created_at: string;
  updated_at: string;
}

export interface CreateApprovalRouteStepParams {
  step_order: number;
  name: string;
  approver_role?: ApprovalRouteApproverRole;
  approver_user_id?: string;
  approver_position_id?: string;
  approver_department_id?: string;
  is_required?: boolean;
  assignee_user_ids?: string[];
}

export interface CreateApprovalRouteParams {
  name: string;
  description?: string;
  is_active?: boolean;
  // JSONB — can be single ApprovalRouteCondition or { groups: ApprovalRouteCondition[] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conditions?: any;
  condition_logic?: "and" | "or";
  weight?: number;
  steps: CreateApprovalRouteStepParams[];
}

export interface UpdateApprovalRouteParams
  extends Partial<Omit<CreateApprovalRouteParams, "steps">> {
  id: string;
  steps?: CreateApprovalRouteStepParams[];
}
