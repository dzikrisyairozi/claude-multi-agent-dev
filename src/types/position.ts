export interface Position {
  id: string;
  name: string;
  level: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePositionParams {
  name: string;
  level: number;
  description?: string;
}

export interface UpdatePositionParams {
  id: string;
  name?: string;
  level?: number;
  description?: string;
  is_active?: boolean;
}
