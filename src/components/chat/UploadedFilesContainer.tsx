"use client";

import { UploadedFileCard } from "./UploadedFileCard";
import { IFileMetadata } from "@/types/file";

interface UploadedFilesContainerProps {
  files: IFileMetadata[];
  failedFiles?: IFileMetadata[];
  onDelete?: (fileId: string) => void;
  deletedFileIds?: Set<string>;
}

export const UploadedFilesContainer = ({
  files,
  failedFiles,
  onDelete,
  deletedFileIds,
}: UploadedFilesContainerProps) => {
  const hasFiles = files && files.length > 0;
  const hasFailedFiles = failedFiles && failedFiles.length > 0;

  if (!hasFiles && !hasFailedFiles) return null;

  return (
    <div className="space-y-2 max-w-xl">
      {hasFiles &&
        files.map((file, index) => (
          <UploadedFileCard
            key={`${file?.id || file?.name}-${index}`}
            file={file}
            onDelete={onDelete}
            isDeleted={!!file?.id && !!deletedFileIds?.has(file.id)}
          />
        ))}
      {hasFailedFiles &&
        failedFiles.map((file, index) => (
          <UploadedFileCard
            key={`failed-${file?.name}-${index}`}
            file={file}
            isFailed
          />
        ))}
    </div>
  );
};
