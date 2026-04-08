export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentParams {
  name: string;
  description?: string;
}

export interface UpdateDepartmentParams {
  id: string;
  name?: string;
  description?: string;
  is_active?: boolean;
}
