export type MgappCategory =
  | "hr"
  | "product"
  | "it"
  | "legal"
  | "facilities"
  | "admin_finance";

export type AISolvability =
  | "ai_answerable"
  | "ai_supported"
  | "human_only";

export interface MgappKnowledgeEntry {
  id: string;
  category: MgappCategory;
  question: string;
  answer: string;
  routing_contact: string | null;
  routing_channel: string | null;
  routing_department: string | null;
  ai_solvability: AISolvability;
  source: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeEntryParams {
  category: MgappCategory;
  question: string;
  answer: string;
  routing_contact?: string;
  routing_channel?: string;
  routing_department?: string;
  ai_solvability: AISolvability;
  source?: string;
}

export interface UpdateKnowledgeEntryParams {
  id: string;
  category?: MgappCategory;
  question?: string;
  answer?: string;
  routing_contact?: string;
  routing_channel?: string;
  routing_department?: string;
  ai_solvability?: AISolvability;
  source?: string;
  is_active?: boolean;
}
