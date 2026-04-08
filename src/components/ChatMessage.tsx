"use client";

import { Bot, FileText, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { IFileMetadata } from "@/types/file";
import { MarkdownContent } from "./chat/MarkdownContent";
import { ApprovalRequestCard } from "./chat/ApprovalRequestCard";
import { PendingApprovalRequests } from "./chat/PendingApprovalRequests";
import { RingiProposalButton } from "./chat/RingiProposalButton";
import { SearchResultsCard } from "./chat/SearchResultsCard";
import { UploadedFilesContainer } from "./chat/UploadedFilesContainer";
import { ImagePreview } from "./chat/ImagePreview";
import { useLanguage } from "@/providers/LanguageProvider";
import { ConversationMessageMetadata } from "@/types/conversation";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  files?: IFileMetadata[];
  timestamp?: string;
  metadata?: ConversationMessageMetadata;
  deletedFileIds?: Set<string>;
}

export const ChatMessage = ({
  role,
  content,
  files,
  timestamp,
  metadata,
  deletedFileIds,
}: ChatMessageProps) => {
  const isUser = role === "user";
  const { language } = useLanguage();
  const locale = language === "ja" ? "ja-JP" : "en-US";

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row gap-4 mb-6",
        isUser && "flex-col items-end md:flex-row-reverse md:items-start",
      )}
    >
      <div className="shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-white text-primary",
          )}
        >
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
      </div>

      <div
        className={cn("flex-1 space-y-3", isUser && "flex flex-col items-end")}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 max-w-full md:max-w-[80%] shadow-soft",
            isUser
              ? "bg-primary text-primary-foreground rounded-md"
              : "bg-card border rounded-md",
          )}
        >
          <MarkdownContent content={content} />

          {/* For assistant messages, show inline image previews inside the bubble */}
          {!isUser && (() => {
            const allFiles = [
              ...(files ?? []),
              ...(metadata?.rag_sources ?? []),
            ];
            const filteredSet = metadata?.filtered_document_ids
              ? new Set(metadata.filtered_document_ids)
              : null;
            const seen = new Set<string>();
            const imageFiles = allFiles.filter((f) => {
              if (!f?.mimeType?.startsWith("image/") || !f?.fileUrl) return false;
              if (f.id && deletedFileIds?.has(f.id)) return false;
              if (filteredSet && f.id && !filteredSet.has(f.id)) return false;
              const key = f.id ?? f.fileUrl;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            if (imageFiles.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-3 mt-3">
                {imageFiles.map((file, i) => (
                  <ImagePreview
                    key={`inline-img-${file.id}-${i}`}
                    fileUrl={file.fileUrl}
                    fileName={file.name}
                  />
                ))}
              </div>
            );
          })()}

          {/* For user messages, show files as inline chips inside the bubble */}
          {isUser && files && files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {files.map((file, index) => {
                const isDeleted = !!file?.id && deletedFileIds?.has(file.id);
                return (
                  <div
                    key={`${file?.name}-${index}`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
                      isDeleted
                        ? "bg-red-500/20 line-through opacity-70"
                        : "bg-primary-foreground/20",
                    )}
                  >
                    {isDeleted ? (
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="max-w-[120px] truncate">{file?.name}</span>
                    {isDeleted && (
                      <span className="ml-1 shrink-0 font-semibold not-italic no-underline opacity-100" style={{ textDecoration: "none" }}>
                        (Deleted)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {timestamp && (
            <p
              className={cn(
                "text-xs mt-2 opacity-70",
                isUser ? "text-right" : "text-left",
              )}
            >
              {new Date(timestamp).toLocaleTimeString(locale)}
            </p>
          )}
        </div>

        {/* For assistant messages, show approval request card if present */}
        {!isUser && metadata?.approval_request_id && (
          <div className="mt-4">
            <ApprovalRequestCard
              approvalRequestId={metadata.approval_request_id}
              className="max-w-xl"
            />
          </div>
        )}

        {/* For assistant messages, show Create Draft button if AI proposed a ringi */}
        {!isUser && metadata?.ringi_proposal && (
          <div className="mt-4">
            <RingiProposalButton proposal={metadata.ringi_proposal} />
          </div>
        )}

        {/* For assistant messages, show pending approval requests if present */}
        {!isUser &&
          metadata?.approval_request_ids &&
          metadata.approval_request_ids.length > 0 && (
            <PendingApprovalRequests ids={metadata.approval_request_ids} />
          )}

        {/* For assistant messages, show uploaded files in compact card */}
        {!isUser && metadata?.source === "upload" && ((files && files.length > 0) || (metadata?.failedFiles && metadata.failedFiles.length > 0)) && (
          <UploadedFilesContainer
            files={files ?? []}
            failedFiles={metadata?.failedFiles}
            deletedFileIds={deletedFileIds}
          />
        )}

        {/* For assistant messages, show found/searched files in SearchResultsCard */}
        {!isUser && metadata?.source !== "upload" && files && files.length > 0 && (
          <SearchResultsCard
            files={files}
            deletedFileIds={deletedFileIds}
            filteredDocumentIds={metadata?.filtered_document_ids}
          />
        )}
      </div>
    </div>
  );
};
