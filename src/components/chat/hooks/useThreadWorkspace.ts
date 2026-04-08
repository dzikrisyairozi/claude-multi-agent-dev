"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createThread,
  updateThread,
  deleteThread,
} from "@/service/thread/thread";
import { insertMessage as insertMessageRecord } from "@/service/message/message";
import { MessageRecord } from "@/types/message";
import { OpenAIChatMessage } from "@/types/openai";
import { DocumentRecord, FileUploadResult } from "@/types/document";
import { deleteDocument } from "@/service/document/document";
import { IFileMetadata, PendingFile } from "@/types/file";
import { ConversationMessage } from "@/types/conversation";
import { ThreadListItem } from "@/types/thread";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { useThreadsQuery } from "@/hooks/chat/useThreadsQuery";
import { useThreadMessagesQuery } from "@/hooks/chat/useThreadMessagesQuery";
import { useAssistantStream } from "@/hooks/chat/useAssistantStream";
import { uploadToS3AndPersist } from "@/service/s3/upload";
import { ProcessingStep } from "@/components/chat/ProcessingSteps";

const mapDocumentsToFileMetadata = (
  documents: DocumentRecord[],
): IFileMetadata[] =>
  documents.map((doc) => ({
    id: doc.id,
    name: doc.file_name,
    mimeType: doc.mime_type ?? "application/octet-stream",
    size: Number(doc.file_size) || 0,
    fileUrl: doc.file_path,
    modifiedTime: doc.created_at,
    extractedText: doc.text_content ?? null,
  }));

type UseThreadWorkspaceOptions = {
  initialThreadId?: string;
  isNewChat?: boolean;
  seedPrompt?: string | null;
};

export function useThreadWorkspace({
  initialThreadId,
  isNewChat = false,
  seedPrompt,
}: UseThreadWorkspaceOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { language, t } = useLanguage();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId ?? null,
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seedHandledFor, setSeedHandledFor] = useState<string | null>(null);

  // Abort controller for cancelling in-flight AI stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Pending files attached via the input (upload starts immediately on add)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);

  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

  const uploadSingleFile = useCallback(
    async (pendingId: string, file: File) => {
      const start = Date.now();
      try {
        const result = await uploadToS3AndPersist({
          files: [file],
          accessToken: session?.access_token ?? "",
        });

        const fileResult = result.results[0];
        if (fileResult?.status === "success" && fileResult.document) {
          setPendingFiles((prev) =>
            prev.map((pf) =>
              pf.id === pendingId
                ? { ...pf, status: "uploaded" as const, document: fileResult.document }
                : pf,
            ),
          );
          if (isDev) {
            const ms = fileResult.uploadMs ?? (Date.now() - start);
            toast.info(`DEV ONLY: upload finish for ${ms} ms`, {
              description: file.name,
              duration: 4000,
            });
          }
        } else {
          setPendingFiles((prev) =>
            prev.map((pf) =>
              pf.id === pendingId
                ? {
                    ...pf,
                    status: "error" as const,
                    error: fileResult?.error || "Upload failed",
                  }
                : pf,
            ),
          );
        }
      } catch (error) {
        setPendingFiles((prev) =>
          prev.map((pf) =>
            pf.id === pendingId
              ? {
                  ...pf,
                  status: "error" as const,
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : pf,
          ),
        );
      }
    },
    [session?.access_token, isDev],
  );

  const addPendingFiles = useCallback(
    (files: File[]) => {
      const newPendingFiles: PendingFile[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "uploading" as const,
      }));

      setPendingFiles((prev) => [...prev, ...newPendingFiles]);

      // Fire off individual uploads immediately
      for (const pf of newPendingFiles) {
        uploadSingleFile(pf.id, pf.file);
      }
    },
    [uploadSingleFile],
  );

  const cleanupUploadedDocument = useCallback((docId: string) => {
    deleteDocument(docId).catch((err) =>
      console.warn("[Cleanup] Failed to delete orphan document:", err)
    );
  }, []);

  const removePendingFile = useCallback(
    (id: string) => {
      setPendingFiles((prev) => {
        const file = prev.find((pf) => pf.id === id);
        // If already uploaded, delete the orphan document
        if (file?.status === "uploaded" && file.document?.id) {
          cleanupUploadedDocument(file.document.id);
        }
        return prev.filter((pf) => pf.id !== id);
      });
    },
    [cleanupUploadedDocument],
  );

  // Keep a ref to pendingFiles for cleanup on unmount (avoids stale closure)
  const pendingFilesRef = useRef(pendingFiles);
  pendingFilesRef.current = pendingFiles;

  const clearPendingFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  // Cleanup orphan documents when navigating away with unsubmitted files
  useEffect(() => {
    return () => {
      const orphans = pendingFilesRef.current.filter(
        (pf) => pf.status === "uploaded" && pf.document?.id
      );
      for (const pf of orphans) {
        deleteDocument(pf.document!.id).catch((err) =>
          console.warn("[Cleanup] Failed to delete orphan on unmount:", err)
        );
      }
    };
  }, []);  

  const clearProcessingSteps = useCallback(() => {
    setProcessingSteps([]);
  }, []);

  const mapRecordToMessage = useCallback(
    (record: MessageRecord): ConversationMessage => {
      const rawMetadata = record.metadata as {
        files?: IFileMetadata[];
        failedFiles?: IFileMetadata[];
        rag_sources?: IFileMetadata[];
        approval_request_id?: string;
        approval_request_ids?: string[];
        source?: "upload" | "search";
        ringi_proposal?: Record<string, unknown>;
        filtered_document_ids?: string[];
      } | null;

      const files = Array.isArray(rawMetadata?.files)
        ? rawMetadata?.files
        : undefined;

      // Build metadata object for ConversationMessage
      const messageMetadata =
        rawMetadata?.approval_request_id ||
        rawMetadata?.approval_request_ids ||
        rawMetadata?.source ||
        rawMetadata?.rag_sources ||
        rawMetadata?.ringi_proposal ||
        rawMetadata?.failedFiles ||
        rawMetadata?.filtered_document_ids
          ? {
              approval_request_id: rawMetadata?.approval_request_id,
              approval_request_ids: rawMetadata?.approval_request_ids,
              rag_sources: rawMetadata?.rag_sources,
              source: rawMetadata?.source,
              ringi_proposal: rawMetadata?.ringi_proposal,
              failedFiles: rawMetadata?.failedFiles,
              filtered_document_ids: rawMetadata?.filtered_document_ids,
            }
          : undefined;

      return {
        id: record.id,
        role: record.role === "assistant" ? "assistant" : "user",
        content: record.content,
        timestamp: record.created_at,
        files,
        metadata: messageMetadata,
      };
    },
    [],
  );

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return "unknown size";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const MAX_MESSAGES_WINDOW = 20;

  const formatMessagesForAI = useCallback(
    (conversation: ConversationMessage[], adHocContext?: string) => {
      let messagesToSend = conversation;

      // Apply window if conversation is long
      if (conversation.length > MAX_MESSAGES_WINDOW) {
        const recentMessages = conversation.slice(-MAX_MESSAGES_WINDOW);
        const olderMessages = conversation.slice(0, -MAX_MESSAGES_WINDOW);
        const olderFileIds = olderMessages.flatMap(
          (m) => m.files?.map((f) => `${f.name} (ID: ${f.id})`) ?? [],
        );

        const summaryContent = [
          `[Conversation Summary - ${olderMessages.length} earlier messages]`,
          olderFileIds.length > 0
            ? `Documents referenced: ${olderFileIds.join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");

        messagesToSend = [
          {
            id: "summary",
            role: "assistant" as const,
            content: summaryContent,
            timestamp: olderMessages[olderMessages.length - 1]?.timestamp ?? "",
          },
          ...recentMessages,
        ];
      }

      const history = messagesToSend.map((message): OpenAIChatMessage => {
        let content = message.content;

        // Build file references for input_file (Responses API)
        const fileRefs = message.files
          ?.filter((f) => f.fileUrl)
          .map((f) => ({
            name: f.name,
            fileUrl: f.fileUrl,
            mimeType: f.mimeType,
          }));

        // Still include file metadata summary in text for context
        if (message.files && message.files.length > 0) {
          const fileContext = message.files
            .map((f) => {
              const parts = [`- ${f.name} (ID: ${f.id})`];
              if (f.mimeType) parts.push(`type: ${f.mimeType}`);
              if (f.size) parts.push(`size: ${formatFileSize(f.size)}`);
              if (f.category) parts.push(`category: ${f.category}`);
              return parts.join(", ");
            })
            .join("\n");
          content = `${content}\n\n[Attached Documents]:\n${fileContext}`;
        }

        return {
          role: message.role,
          content,
          files: fileRefs && fileRefs.length > 0 ? fileRefs : undefined,
        };
      });

      const enriched = adHocContext
        ? [
            ...history,
            { role: "user", content: adHocContext } as OpenAIChatMessage,
          ]
        : history;

      return enriched;
    },
    [],
  );

  const { threads, isLoading: threadsLoading } = useThreadsQuery();
  const { messages: fetchedMessages, isLoading: messagesQueryLoading } =
    useThreadMessagesQuery(activeThreadId);

  const messagesLoading = activeThreadId ? messagesQueryLoading : false;

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    if (!fetchedMessages) return;

    setMessages((prevMessages) => {
      // Keep any optimistic local messages (user uploads or streaming bot messages)
      const optimisticMsgs = prevMessages.filter(
        (m) =>
          m.id.startsWith("optimistic-") ||
          m.id.startsWith("streaming-") ||
          // Also keep any pending messages while submission is active
          (isSubmitting &&
            m.role === "user" &&
            !fetchedMessages.find((fm) => fm.id === m.id)),
      );

      // Map remote messages
      const remoteMsgs = fetchedMessages.map(mapRecordToMessage);

      // Merge: remote first, then any pending optimistic ones that haven't been saved yet
      // Remove any optimistic messages that now have a real saved counterpart in remoteMsgs
      const remainingOptimistic = optimisticMsgs.filter(
        (optMsg) =>
          !remoteMsgs.some((remoteMsg) => {
            const remoteTime = remoteMsg.timestamp
              ? new Date(remoteMsg.timestamp).getTime()
              : 0;
            const optTime = optMsg.timestamp
              ? new Date(optMsg.timestamp).getTime()
              : 0;
            return (
              remoteMsg.role === optMsg.role &&
              remoteMsg.content === optMsg.content &&
              Math.abs(remoteTime - optTime) < 5000
            );
          }),
      );

      return [...remoteMsgs, ...remainingOptimistic];
    });
  }, [activeThreadId, fetchedMessages, mapRecordToMessage, isSubmitting]);

  const ensureThread = useCallback(
    async (titleHint?: string): Promise<string> => {
      if (activeThreadId) return activeThreadId;

      const title = (titleHint ?? t("chat.newChatTitle")).slice(0, 80);
      const newThreadId = await createThread(title);
      setActiveThreadId(newThreadId);
      // Optimistic update: add new thread to cache instead of re-fetching
      queryClient.setQueryData(
        ["threads"],
        (prev: ThreadListItem[] | undefined) => [
          { id: newThreadId, title, updated_at: new Date().toISOString() },
          ...(prev ?? []),
        ],
      );
      return newThreadId;
    },
    [activeThreadId, queryClient, t],
  );

  const saveMessage = useCallback(
    async (
      threadId: string,
      payload: {
        role: ConversationMessage["role"];
        content: string;
        files?: IFileMetadata[];
        metadata?: Record<string, unknown> | null;
      },
    ) => {
      const record = await insertMessageRecord(threadId, {
        role: payload.role,
        content: payload.content,
        metadata:
          payload.metadata ??
          (payload.files ? { files: payload.files } : undefined),
      });
      queryClient.setQueryData(
        ["threadMessages", threadId],
        (prev: MessageRecord[] | undefined) => [...(prev ?? []), record],
      );
      return mapRecordToMessage(record);
    },
    [mapRecordToMessage, queryClient],
  );

  const { streamAssistantReply } = useAssistantStream({
    formatMessages: formatMessagesForAI,
    accessToken: session?.access_token,
    language,
  });

  useEffect(() => {
    setSeedHandledFor(null);
  }, [activeThreadId]);

  const runAssistantResponse = useCallback(
    async ({
      threadId,
      conversation,
      adHocContext,
      isUploadContext = false,
    }: {
      threadId: string;
      conversation: ConversationMessage[];
      adHocContext?: string;
      isUploadContext?: boolean;
    }) => {
      // Create an AbortController for this stream
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Track accumulated content for partial save on abort
      let lastAccumulated = "";

      try {
        // Create a temporary streaming message
        const streamingMessage: ConversationMessage = {
          id: `streaming-${Date.now()}`,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        };

        // Add streaming message to display it immediately
        setMessages([...conversation, streamingMessage]);

        const { finalContent, sanitizedConversation, toolMetadata } =
          await streamAssistantReply({
            threadId,
            conversation,
            adHocContext,
            signal: controller.signal,
            onProgress: (progressMessage) => {
              // Show progress messages (e.g., "🔍 Searching documents...")
              setMessages([
                ...conversation,
                {
                  ...streamingMessage,
                  content: `*${progressMessage}*`,
                },
              ]);
            },
            onChunk: (_chunk, accumulated) => {
              lastAccumulated = accumulated;
              // Update the streaming message with accumulated content
              setMessages([
                ...conversation,
                { ...streamingMessage, content: accumulated },
              ]);
            },
          });

        // Determine file source: "upload" if user just uploaded files, otherwise "search"
        const fileSource = isUploadContext
          ? ("upload" as const)
          : ("search" as const);

        // Filter files to only those actually mentioned in the AI's response text.
        // This keeps the file cards aligned with what the user reads in chat.
        const mentionedFilteredIds = (() => {
          if (isUploadContext) return toolMetadata?.filtered_document_ids;
          const files = toolMetadata?.files;
          if (!files || files.length === 0) return toolMetadata?.filtered_document_ids;
          const lowerContent = (finalContent || "").toLowerCase();
          const mentioned = files
            .filter((f) => f.name && lowerContent.includes(f.name.toLowerCase()))
            .map((f) => f.id);
          // If nothing matched (AI didn't name any file), fall back to server filter
          return mentioned.length > 0
            ? mentioned
            : toolMetadata?.filtered_document_ids;
        })();

        // Build metadata with approval_request_id if present
        const messageMetadata =
          toolMetadata?.approval_request_id ||
          toolMetadata?.approval_request_ids ||
          toolMetadata?.folder_id ||
          toolMetadata?.files ||
          toolMetadata?.rag_sources ||
          toolMetadata?.ringi_proposal ||
          toolMetadata?.filtered_document_ids
            ? {
                approval_request_id: toolMetadata.approval_request_id,
                approval_request_ids: toolMetadata.approval_request_ids,
                folder_id: toolMetadata.folder_id,
                files: toolMetadata.files,
                rag_sources: toolMetadata.rag_sources,
                source: toolMetadata?.files ? fileSource : undefined,
                ringi_proposal: toolMetadata.ringi_proposal,
                filtered_document_ids: mentionedFilteredIds,
              }
            : undefined;

        // Extract files from toolMetadata to pass to the message
        const filesForMessage = toolMetadata?.files?.map((f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          fileUrl: f.fileUrl,
          modifiedTime: f.modifiedTime,
          category: f.category,
        }));

        const assistantMessage = await saveMessage(threadId, {
          role: "assistant",
          content: finalContent,
          files: filesForMessage,
          metadata: messageMetadata,
        });

        const nextConversation =
          sanitizedConversation.length > 0
            ? sanitizedConversation
            : conversation;

        setMessages([...nextConversation, assistantMessage]);
      } catch (error: unknown) {
        // If aborted by user, save partial content instead of showing error
        if (error instanceof DOMException && error.name === "AbortError") {
          if (lastAccumulated.trim()) {
            const partialMessage = await saveMessage(threadId, {
              role: "assistant",
              content: lastAccumulated.trim(),
            });
            setMessages([...conversation, partialMessage]);
          }
          return;
        }
        setMessages(conversation);
        toast.error(t("toast.assistantFailed"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        abortControllerRef.current = null;
      }
    },
    [saveMessage, streamAssistantReply, t],
  );

  useEffect(() => {
    if (!seedPrompt || !activeThreadId || seedHandledFor === activeThreadId)
      return;

    setSeedHandledFor(activeThreadId);

    // Run assistant response and navigate after completion
    runAssistantResponse({
      threadId: activeThreadId,
      conversation: messages,
      adHocContext: seedPrompt.trim(),
    }).then(() => {
      router.replace(`/c/${activeThreadId}`);
    });
  }, [
    seedPrompt,
    seedHandledFor,
    activeThreadId,
    runAssistantResponse,
    messages,
    router,
  ]);

  const handleSendMessage = useCallback(async () => {
    const cleanMessage = inputMessage.trim();
    const hasFiles = pendingFiles.length > 0;

    // Need either a message or files to send
    if (!cleanMessage && !hasFiles) return;

    setInputMessage("");

    // Always show loading indicator immediately
    setIsGenerating(true);
    if (!hasFiles) {
      setIsSubmitting(true);
    }

    // Capture pending files before clearing (already uploaded to S3)
    const filesToSend = [...pendingFiles];
    clearPendingFiles();

    let ensuredThreadId: string | null = null;
    let conversationForAssistant: ConversationMessage[] = [];

    // Collect pre-uploaded documents from pending files
    const successfulPending = filesToSend.filter(
      (pf) => pf.status === "uploaded" && pf.document,
    );
    const failedPending = filesToSend.filter((pf) => pf.status === "error");

    // Create user message content early to show optimistically
    const messageContent =
      cleanMessage ||
      t("chat.uploadedSummary", {
        count: filesToSend.length,
        files: filesToSend.map((pf) => pf.file.name).join(", "),
      });

    // Show optimistic user message immediately
    const optimisticUserMsg: ConversationMessage = {
      id: `optimistic-user-${Date.now()}`,
      role: "user",
      content: messageContent,
      files: successfulPending.map((pf) => ({
        id: pf.document!.id,
        name: pf.file.name,
        mimeType: pf.file.type,
        size: pf.file.size,
        fileUrl: pf.document!.file_path,
        modifiedTime: pf.document!.created_at,
      })),
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, optimisticUserMsg]);
    const currentConversation = [...messages, optimisticUserMsg];

    try {
      const titleHint =
        cleanMessage || filesToSend[0]?.file.name || t("chat.newChatTitle");
      ensuredThreadId = await ensureThread(titleHint);

      const uploadedDocs = successfulPending
        .map((pf) => pf.document!)
        .filter(Boolean);
      const uploadedFiles = mapDocumentsToFileMetadata(uploadedDocs);
      const failedResults: FileUploadResult[] = failedPending.map((pf) => ({
        status: "failed" as const,
        fileName: pf.file.name,
        error: pf.error,
      }));

      // Handle file upload feedback
      if (hasFiles) {
        // Show toast for failures
        if (failedResults.length > 0 && successfulPending.length > 0) {
          toast.warning(
            t("toast.uploadPartialSuccess", {
              successCount: successfulPending.length,
              failCount: failedResults.length,
            }),
            {
              description: failedResults
                .map(
                  (r) =>
                    `${r.fileName}: ${r.error || t("generic.somethingWrong")}`,
                )
                .join("; "),
            },
          );
        } else if (
          failedResults.length > 0 &&
          successfulPending.length === 0
        ) {
          toast.error(t("toast.uploadFailed"), {
            description: failedResults
              .map(
                (r) =>
                  `${r.fileName}: ${r.error || t("generic.somethingWrong")}`,
              )
              .join("; "),
          });
          setIsGenerating(false);
          return;
        }
        // Embedding now happens in the upload API (fire-and-forget), no separate ingest needed
      }

      // Save user message with files metadata
      const savedMessage = await saveMessage(ensuredThreadId, {
        role: "user",
        content: messageContent,
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      });

      // Replace optimistic message with the saved one
      conversationForAssistant = currentConversation.map((m) =>
        m.id === optimisticUserMsg.id ? savedMessage : m,
      );
      setMessages(conversationForAssistant);

      // Inject upload confirmation assistant message if files were uploaded
      if (hasFiles && uploadedFiles.length > 0) {
        const dupeCount = uploadedDocs.filter((d) => d.duplicate).length;
        const newCount = uploadedDocs.length - dupeCount;
        const failCount = failedResults.length;

        const failedFileMetadata: IFileMetadata[] = failedResults.map((r) => ({
          id: "",
          name: r.fileName,
          mimeType: "application/octet-stream",
          size: 0,
          fileUrl: "",
          modifiedTime: new Date().toISOString(),
        }));

        let confirmationText: string;
        if (failCount > 0) {
          confirmationText = t("chat.uploadAssistantResponsePartial", {
            successCount: uploadedDocs.length,
            failCount,
            failedFiles: failedResults.map((r) => r.fileName).join(", "),
          });
        } else if (dupeCount === uploadedDocs.length) {
          confirmationText = t("chat.uploadAssistantResponseAllDuplicate", {
            count: dupeCount,
          });
        } else if (dupeCount > 0) {
          confirmationText = t("chat.uploadAssistantResponseMixed", {
            newCount,
            dupeCount,
          });
        } else {
          confirmationText = t("chat.uploadAssistantResponse", {
            count: uploadedFiles.length,
          });
        }

        const confirmationMessage = await saveMessage(ensuredThreadId, {
          role: "assistant",
          content: confirmationText,
          files: uploadedFiles,
          metadata: {
            files: uploadedFiles,
            ...(failedFileMetadata.length > 0 && {
              failedFiles: failedFileMetadata,
            }),
            source: "upload",
          },
        });
        conversationForAssistant = [
          ...conversationForAssistant,
          confirmationMessage,
        ];
        setMessages(conversationForAssistant);
      }

      setIsSubmitting(false);
      setIsGenerating(true);

      if (!ensuredThreadId) {
        return;
      }

      const streamPromise = runAssistantResponse({
        threadId: ensuredThreadId,
        conversation: conversationForAssistant,
        isUploadContext: hasFiles,
      });

      await streamPromise;

      // Update URL without triggering a Next.js route transition (avoids component remount flash)
      if (isNewChat && !initialThreadId) {
        window.history.replaceState(null, "", `/c/${ensuredThreadId}`);
      }
    } catch (error: unknown) {
      toast.error(t("toast.sendMessageFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
      setInputMessage(cleanMessage);
      return;
    } finally {
      setIsGenerating(false);
      setIsSubmitting(false);
      clearProcessingSteps();
    }
  }, [
    inputMessage,
    pendingFiles,
    clearPendingFiles,
    ensureThread,
    saveMessage,
    runAssistantResponse,
    isNewChat,
    initialThreadId,
    messages,
    t,
    clearProcessingSteps,
  ]);  

  const handleThreadSelect = useCallback(
    (targetId: string) => {
      if (targetId === activeThreadId) return;
      router.push(`/c/${targetId}`);
    },
    [activeThreadId], // eslint-disable-line react-hooks/exhaustive-deps -- router is stable
  );

  const handleStartNewChat = useCallback(() => {
    // Reset all chat state for a fresh conversation
    setActiveThreadId(null);
    setMessages([]);
    setInputMessage("");
    setPendingFiles([]);
    setProcessingSteps([]);
    setIsGenerating(false);
    setIsSubmitting(false);
    setSeedHandledFor(null);

    // Fix URL if it was changed via window.history.replaceState (desync case)
    if (window.location.pathname !== "/c") {
      window.history.replaceState(null, "", "/c");
    }
    router.push("/c");
  }, [router]);

  const isEmpty = useMemo(
    () => !messagesLoading && messages.length === 0 && !isGenerating,
    [messagesLoading, messages.length, isGenerating],
  );

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
    clearProcessingSteps();
  }, [clearProcessingSteps]);

  const isBusy = isGenerating || isSubmitting;

  const hasFilesUploading = useMemo(
    () => pendingFiles.some((pf) => pf.status === "uploading"),
    [pendingFiles],
  );

  const handleRenameThread = useCallback(
    async (threadId: string, newTitle: string) => {
      try {
        await updateThread(threadId, { title: newTitle });
        // Optimistic update instead of re-fetch
        queryClient.setQueryData(
          ["threads"],
          (prev: ThreadListItem[] | undefined) =>
            (prev ?? []).map((t) =>
              t.id === threadId ? { ...t, title: newTitle } : t,
            ),
        );
      } catch (error: unknown) {
        toast.error("Failed to rename thread", {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [queryClient],
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      try {
        await deleteThread(threadId);
        // Optimistic remove instead of re-fetch
        queryClient.setQueryData(
          ["threads"],
          (prev: ThreadListItem[] | undefined) =>
            (prev ?? []).filter((t) => t.id !== threadId),
        );
        if (activeThreadId === threadId) {
          handleStartNewChat();
        }
      } catch (error: unknown) {
        toast.error("Failed to delete thread", {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [queryClient, activeThreadId, handleStartNewChat],
  );

  return {
    messages,
    messagesLoading,
    isProcessing: isGenerating,
    isSubmitting,
    isBusy,
    inputMessage,
    setInputMessage,
    handleSendMessage,
    handleStopGeneration,
    activeThreadId,
    isEmpty,
    // Pending files for inline attachment
    pendingFiles,
    addPendingFiles,
    removePendingFile,
    hasFilesUploading,
    processingSteps,
    sidebarProps: {
      threads,
      activeThreadId: activeThreadId ?? "",
      isLoading: threadsLoading,
      onSelect: handleThreadSelect,
      onNewChat: handleStartNewChat,
      onRename: handleRenameThread,
      onDelete: handleDeleteThread,
    },
  };
}
