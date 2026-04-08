export type FolderRecord = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CreateFolderPayload = {
  name: string;
  parent_id?: string | null;
};

export type UpdateFolderPayload = {
  name?: string;
};

export type MoveFolderPayload = {
  parent_id: string | null;
};

export type MoveFilePayload = {
  folder_id: string | null;
};

export type BreadcrumbItem = {
  id: string | null;
  name: string;
};

export type FolderContents = {
  folder: FolderRecord | null;
  folders: FolderRecord[];
  documents: import("./document").DocumentRecord[];
  breadcrumbs: BreadcrumbItem[];
};
