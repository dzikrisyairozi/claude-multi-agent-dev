export type ParentCategory = "purchasing" | "contracts" | "expenses" | "other";

export interface CategoryType {
  id: string;
  category: ParentCategory;
  name: string;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryTypeParams {
  category: ParentCategory;
  name: string;
  description?: string;
  notes?: string;
}

export interface UpdateCategoryTypeParams {
  id: string;
  name?: string;
  description?: string;
  notes?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface CategoryGroup {
  category: ParentCategory;
  label: string;
  subtitle: string;
  types: CategoryType[];
}
