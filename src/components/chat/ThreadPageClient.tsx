"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck,
  FileText,
  Loader2,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { ThreadSidebar } from "@/components/chat/ThreadSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { FileUploadZone } from "@/components/FileUploadZone";
import { ProcessingSteps } from "@/components/chat/ProcessingSteps";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useThreadWorkspace } from "./hooks/useThreadWorkspace";
import { useDeletedFiles } from "@/hooks/chat/useDeletedFiles";
import { useLanguage } from "@/providers/LanguageProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ThreadPageClientProps = {
  threadId?: string;
  isNewChat?: boolean;
};

export function ThreadPageClient({
  threadId,
  isNewChat = false,
}: ThreadPageClientProps) {
  const searchParams = useSearchParams();
  const seedPrompt = searchParams.get("seed");
  const { t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    messagesLoading,
    isProcessing,
    isSubmitting,
    isBusy,
    inputMessage,
    setInputMessage,
    handleSendMessage,
    handleStopGeneration,
    isEmpty,
    sidebarProps,
    pendingFiles,
    addPendingFiles,
    removePendingFile,
    hasFilesUploading,
    processingSteps,
  } = useThreadWorkspace({ initialThreadId: threadId, isNewChat, seedPrompt });

  const { deletedFileIds } = useDeletedFiles(messages);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    // Validate files
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword",
      "text/csv",
      "text/plain",
      "text/markdown",
      "image/jpeg",
      "image/png",
      "image/heic",
    ];

    const validFiles = files.filter(
      (file) => file.size <= maxSize && allowedTypes.includes(file.type),
    );

    if (validFiles.length < files.length) {
      toast.error(t("upload.invalidFiles.title"), {
        description: t("upload.invalidFiles.description", {
          count: files.length - validFiles.length,
        }),
      });
    }

    if (validFiles.length > 0) {
      addPendingFiles(validFiles);
    }

    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDraggingOver(false);
      if (isProcessing) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        addPendingFiles(files);
      }
    },
    [isProcessing, addPendingFiles],
  );

  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;
    const raf = requestAnimationFrame(() => {
      scrollEl.scrollTo({
        top: scrollEl.scrollHeight,
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, isProcessing]);

  return (
    <ChatLayout
      sidebar={
        <ThreadSidebar
          {...sidebarProps}
          className="h-full rounded-none border-none shadow-none"
        />
      }
    >
      <div className="bg-white p-5 pb-0 h-full">
        <div
          className="flex flex-col h-full bg-[#EFF3F6] rounded-t-2xl relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay — shown when dragging files over chat area */}
          {isDraggingOver && !isEmpty && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-t-2xl">
              <Image
                src="/images/drag_and_drop.png"
                alt="Drop files"
                width={180}
                height={180}
                className="mb-4"
              />
              <h3 className="text-xl font-bold text-slate-800">Add any file</h3>
              <p className="text-sm text-slate-500 mt-1">
                Drop any file here to add it to the conversation
              </p>
            </div>
          )}
          <section
            ref={scrollContainerRef}
            className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pb-24"
          >
            <div className="flex-1 space-y-4 max-w-4xl mx-auto w-full">
              {messagesLoading && (
                <p className="text-sm text-muted-foreground">
                  {t("chat.loading")}
                </p>
              )}

              {isEmpty && (
                <div className="flex flex-col items-center justify-center h-full py-8 px-4">
                  {/* Logo and Greeting */}
                  <div className="mb-8 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow mb-4">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h3 className="text-slate-400 text-base mb-1">
                      {t("chat.greeting")}
                    </h3>
                    <h1 className="text-3xl font-bold text-slate-800">
                      {t("chat.howCanIHelp")}
                    </h1>
                  </div>

                  {/* Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl w-full px-4">
                    {/* Card 1 */}
                    <button
                      onClick={() =>
                        setInputMessage(t("chat.createSubmissionFromDocs"))
                      }
                      className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200 hover:bg-sky-100/50 hover:border-sky-200 transition-all text-left h-full group"
                    >
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
                        <FileText className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-sky-600 font-medium text-base leading-snug">
                        {t("chat.createSubmissionFromDocs")}
                      </span>
                    </button>

                    {/* Card 2 */}
                    <button
                      onClick={() =>
                        setInputMessage(t("chat.findApprovalEvidence"))
                      }
                      className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200 hover:bg-sky-100/50 hover:border-sky-300 hover:shadow-md transition-all text-left h-full group"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                        <Search className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-slate-700 font-medium text-base leading-snug">
                        {t("chat.findApprovalEvidence")}
                      </span>
                    </button>

                    {/* Card 3 */}
                    <button
                      onClick={() =>
                        setInputMessage(t("chat.reviewSubmissionStatus"))
                      }
                      className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200 hover:bg-sky-100/50 hover:border-sky-300 hover:shadow-md transition-all text-left h-full group"
                    >
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
                        <FileCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-slate-700 font-medium text-base leading-snug">
                        {t("chat.reviewSubmissionStatus")}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {messages
                .filter((m) => !(m.role === "assistant" && m.content === ""))
                .map((message) => (
                  <ChatMessage key={message.id} {...message} deletedFileIds={deletedFileIds} />
                ))}

              {/* Processing Steps UI */}
              {processingSteps.length > 0 && (
                <ProcessingSteps steps={processingSteps} />
              )}

              {/* Show "Thinking..." until first streaming token arrives */}
              {isProcessing && !isSubmitting && processingSteps.length === 0 &&
                !messages.some((m) => m.id.startsWith("streaming-") && m.content) && (
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-white text-primary flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-card border rounded-md px-4 py-3 max-w-[80%] shadow-soft">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-bounce" />
                          <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-bounce [animation-delay:0.15s]" />
                          <div className="w-2.5 h-2.5 rounded-full bg-primary/80 animate-bounce [animation-delay:0.3s]" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {t("chat.thinking")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isEmpty && processingSteps.length === 0 && (
              <FileUploadZone
                onFilesSelected={addPendingFiles}
                disabled={isProcessing}
              />
            )}
          </section>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-[#EFF3F6] via-[#EFF3F6] to-transparent">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                {/* Pending Files Chips - Inside the white container */}
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-4 pt-3">
                    {pendingFiles.map((pf) => (
                      <div
                        key={pf.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm group transition-colors",
                          pf.status === "error"
                            ? "bg-red-50 border border-red-200 hover:border-red-300"
                            : "bg-slate-50 border border-slate-200 hover:border-slate-300",
                        )}
                      >
                        {pf.status === "uploading" && (
                          <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center shrink-0">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#DE4841" }} />
                          </div>
                        )}
                        {pf.status === "uploaded" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {pf.status === "error" && (
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span
                          className={cn(
                            "font-medium max-w-[150px] truncate",
                            pf.status === "error"
                              ? "text-destructive"
                              : pf.status === "uploading"
                                ? "text-[#DE4841]"
                                : "text-slate-600",
                          )}
                        >
                          {pf.file.name}
                        </span>
                        <button
                          onClick={() => removePendingFile(pf.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Row */}
                <div className="flex items-end gap-2 p-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xlsx,.pptx,.csv,.txt,.md,.jpg,.jpeg,.png,.heic"
                  />

                  {/* Paperclip button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleAttachmentClick}
                    disabled={isProcessing}
                    className="shrink-0 text-slate-400 hover:text-primary mb-1"
                    aria-label="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>

                  <Textarea
                    placeholder={t("chat.placeholder")}
                    value={inputMessage}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
                      // Auto-resize: reset height then set to scrollHeight
                      const el = e.target;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isProcessing}
                    rows={1}
                    className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 text-slate-600 placeholder:text-slate-400 resize-none min-h-10 max-h-[200px] py-2 overflow-y-auto"
                  />
                  {isProcessing ? (
                    <Button
                      onClick={handleStopGeneration}
                      className="rounded-lg bg-destructive hover:bg-destructive/90 text-white px-4"
                    >
                      {t("chat.stop")}
                      <Square className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        isBusy ||
                        hasFilesUploading ||
                        (!inputMessage.trim() && pendingFiles.length === 0)
                      }
                      className="rounded-lg bg-primary hover:bg-primary/90 text-white px-4"
                    >
                      {t("chat.send")}
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
