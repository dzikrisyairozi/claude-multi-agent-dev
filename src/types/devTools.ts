export interface ResetResult {
  success: boolean;
  deleted: {
    approval_requests: number;
    documents: number;
    threads: number;
    folders: number;
    activity_logs: number;
    s3_files: number;
  };
  errors: string[];
}

export interface UserDataStats {
  threads: number;
  messages: number;
  documents: number;
  embeddings: number;
  approval_requests: number;
  folders: number;
  activity_logs: number;
}
