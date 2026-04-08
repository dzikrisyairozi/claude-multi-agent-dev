export type UserRole =
  | "approver"
  | "requester"
  | "accounting"
  | "admin"
  | "platform_admin";

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: UserRole;
  department_id: string | null;
  position_id: string | null;
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  is_active: boolean | null;
  email_confirmed_at?: string | null;
}

export interface CreateUserParams {
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  departmentId?: string;
  positionId?: string;
}

export interface UpdateUserParams {
  id: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  departmentId?: string | null;
  positionId?: string | null;
}
