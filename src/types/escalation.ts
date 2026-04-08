export interface EscalationInfo {
  requestId: string;
  requestTitle: string;
  requestCode: string;
  currentStepOrder: number;
  currentStepName: string;
  originalAssignee: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role: string | null;
  } | null;
  escalatedAt: string | null;
  categoryTypeName: string | null;
  amount: number | null;
  vendorName: string | null;
  category: string | null;
  priority: string | null;
}

export interface AvailableApprover {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  pendingCount: number;
}

export interface ProxyApproveParams {
  requestId: string;
  comment: string;
}

export interface ReassignApproverParams {
  requestId: string;
  newUserId: string;
  reason: string;
}
