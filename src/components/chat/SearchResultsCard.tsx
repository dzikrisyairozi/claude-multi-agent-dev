"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { FileCard } from "@/components/FileCard";
import { IFileMetadata } from "@/types/file";

interface SearchResultsCardProps {
  files: IFileMetadata[];
  deletedFileIds?: Set<string>;
  filteredDocumentIds?: string[];
}

export const SearchResultsCard = ({
  files,
  deletedFileIds,
  filteredDocumentIds,
}: SearchResultsCardProps) => {
  const [showAll, setShowAll] = useState(files.length <= 1);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilter = !!filteredDocumentIds && filteredDocumentIds.length > 0;

  // Derive visible files from props (no setState needed)
  const visibleFiles = useMemo(() => {
    if (hasFilter) {
      const relevantSet = new Set(filteredDocumentIds);
      return files.filter((f) => relevantSet.has(f.id));
    }
    if (showAll) return files;
    return files.length > 0 ? [files[0]] : [];
  }, [files, filteredDocumentIds, hasFilter, showAll]);

  const isChecking = !hasFilter && !showAll && files.length > 1;

  // Fallback: if filter never arrives, show all after 5s
  useEffect(() => {
    if (files.length <= 1) return;

    fallbackRef.current = setTimeout(() => {
      setShowAll(true);
    }, 5000);

    return () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear fallback when filter arrives
  useEffect(() => {
    if (hasFilter && fallbackRef.current) {
      clearTimeout(fallbackRef.current);
    }
  }, [hasFilter]);

  if (!files || files.length === 0) return null;

  return (
    <Card className="p-4 bg-card border rounded-xl max-w-xl">
      <h3 className="font-semibold text-sm mb-3">
        Found {visibleFiles.length} item{visibleFiles.length !== 1 ? "s" : ""}
      </h3>

      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
        {visibleFiles.map((file, index) => (
          <div
            key={`${file?.id || file?.name}-${index}`}
            className="animate-in fade-in duration-300"
          >
            <FileCard
              file={file}
              isDeleted={!!file?.id && !!deletedFileIds?.has(file.id)}
            />
          </div>
        ))}

        {isChecking && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
            Checking other results...
          </div>
        )}
      </div>
    </Card>
  );
};
