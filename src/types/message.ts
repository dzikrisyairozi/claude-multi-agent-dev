export type MessageRecord = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  metadata?: Record<string, any> | null;
};
