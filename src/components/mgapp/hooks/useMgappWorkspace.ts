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
  fetchThreads as fetchThreadsFromDb,
} from "@/service/thread/thread";
import { insertMessage as insertMessageRecord } from "@/service/message/message";
import { MessageRecord } from "@/types/message";
import { OpenAIChatMessage } from "@/types/openai";
import { ConversationMessage } from "@/types/conversation";
import { ThreadListItem } from "@/types/thread";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { useAssistantStream } from "@/hooks/chat/useAssistantStream";
import { useThreadMessagesQuery } from "@/hooks/chat/useThreadMessagesQuery";
import { streamMgappResponse } from "@/service/openai/mgappChat";
import { useQuery } from "@tanstack/react-query";

type UseMgappWorkspaceOptions = {
  initialThreadId?: string;
  isNewChat?: boolean;
};

export function useMgappWorkspace({
  initialThreadId,
  isNewChat = false,
}: UseMgappWorkspaceOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { language, t } = useLanguage();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId ?? null
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Threads query (mgapp mode)
  const threadsQuery = useQuery<ThreadListItem[], Error>({
    queryKey: ["mgapp-threads"],
    queryFn: () => fetchThreadsFromDb("mgapp"),
    staleTime: 1000 * 60,
    enabled: !!session,
  });

  const threads = threadsQuery.data ?? [];
  const threadsLoading = threadsQuery.isLoading;

  const { messages: fetchedMessages, isLoading: messagesQueryLoading } =
    useThreadMessagesQuery(activeThreadId);
  const messagesLoading = activeThreadId ? messagesQueryLoading : false;

  const mapRecordToMessage = useCallback(
    (record: MessageRecord): ConversationMessage => ({
      id: record.id,
      role: record.role === "assistant" ? "assistant" : "user",
      content: record.content,
      timestamp: record.created_at,
    }),
    []
  );

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    if (!fetchedMessages) return;

    setMessages((prev) => {
      const optimisticMsgs = prev.filter(
        (m) =>
          m.id.startsWith("optimistic-") ||
          m.id.startsWith("streaming-") ||
          (isSubmitting &&
            m.role === "user" &&
            !fetchedMessages.find((fm) => fm.id === m.id))
      );
      const remoteMsgs = fetchedMessages.map(mapRecordToMessage);
      const remainingOptimistic = optimisticMsgs.filter(
        (optMsg) =>
          !remoteMsgs.some(
            (rm) =>
              rm.role === optMsg.role &&
              rm.content === optMsg.content &&
              Math.abs(
                new Date(rm.timestamp || "").getTime() -
                  new Date(optMsg.timestamp || "").getTime()
              ) < 5000
          )
      );
      return [...remoteMsgs, ...remainingOptimistic];
    });
  }, [activeThreadId, fetchedMessages, mapRecordToMessage, isSubmitting]);

  const MAX_MESSAGES_WINDOW = 20;

  const formatMessagesForAI = useCallback(
    (conversation: ConversationMessage[], adHocContext?: string) => {
      let messagesToSend = conversation;
      if (conversation.length > MAX_MESSAGES_WINDOW) {
        messagesToSend = conversation.slice(-MAX_MESSAGES_WINDOW);
      }

      const history = messagesToSend.map(
        (message): OpenAIChatMessage => ({
          role: message.role,
          content: message.content,
        })
      );

      return adHocContext
        ? [...history, { role: "user" as const, content: adHocContext }]
        : history;
    },
    []
  );

  const ensureThread = useCallback(
    async (titleHint?: string): Promise<string> => {
      if (activeThreadId) return activeThreadId;

      const title = (titleHint ?? t("chat.newChatTitle")).slice(0, 80);
      const newThreadId = await createThread(title, "mgapp");
      setActiveThreadId(newThreadId);
      queryClient.setQueryData(
        ["mgapp-threads"],
        (prev: ThreadListItem[] | undefined) => [
          { id: newThreadId, title, updated_at: new Date().toISOString() },
          ...(prev ?? []),
        ]
      );
      return newThreadId;
    },
    [activeThreadId, queryClient, t]
  );

  const saveMessage = useCallback(
    async (
      threadId: string,
      payload: {
        role: ConversationMessage["role"];
        content: string;
        metadata?: Record<string, unknown> | null;
      }
    ) => {
      const record = await insertMessageRecord(threadId, {
        role: payload.role,
        content: payload.content,
        metadata: payload.metadata ?? undefined,
      });
      queryClient.setQueryData(
        ["threadMessages", threadId],
        (prev: MessageRecord[] | undefined) => [...(prev ?? []), record]
      );
      return mapRecordToMessage(record);
    },
    [mapRecordToMessage, queryClient]
  );

  // Use the assistant stream hook with mgapp stream function
  const { streamAssistantReply } = useAssistantStream({
    formatMessages: formatMessagesForAI,
    accessToken: session?.access_token,
    language,
    streamFn: streamMgappResponse,
  });

  const runAssistantResponse = useCallback(
    async ({
      threadId,
      conversation,
    }: {
      threadId: string;
      conversation: ConversationMessage[];
    }) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      let lastAccumulated = "";

      try {
        const streamingMessage: ConversationMessage = {
          id: `streaming-${Date.now()}`,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        };

        setMessages([...conversation, streamingMessage]);

        const { finalContent, sanitizedConversation } =
          await streamAssistantReply({
            threadId,
            conversation,
            signal: controller.signal,
            onChunk: (_chunk, accumulated) => {
              lastAccumulated = accumulated;
              setMessages([
                ...conversation,
                { ...streamingMessage, content: accumulated },
              ]);
            },
          });

        const assistantMessage = await saveMessage(threadId, {
          role: "assistant",
          content: finalContent,
        });

        const nextConversation =
          sanitizedConversation.length > 0
            ? sanitizedConversation
            : conversation;

        setMessages([...nextConversation, assistantMessage]);
      } catch (error: unknown) {
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
    [saveMessage, streamAssistantReply, t]
  );

  const handleSendMessage = useCallback(async () => {
    const cleanMessage = inputMessage.trim();
    if (!cleanMessage) return;

    setInputMessage("");
    setIsGenerating(true);
    setIsSubmitting(true);

    const optimisticUserMsg: ConversationMessage = {
      id: `optimistic-user-${Date.now()}`,
      role: "user",
      content: cleanMessage,
      timestamp: new Date().toISOString(),
    };
    const currentConversation = [...messages, optimisticUserMsg];
    setMessages(currentConversation);

    try {
      const ensuredThreadId = await ensureThread(cleanMessage);

      const savedMessage = await saveMessage(ensuredThreadId, {
        role: "user",
        content: cleanMessage,
      });

      const conversationForAssistant = currentConversation.map((m) =>
        m.id === optimisticUserMsg.id ? savedMessage : m
      );
      setMessages(conversationForAssistant);
      setIsSubmitting(false);

      await runAssistantResponse({
        threadId: ensuredThreadId,
        conversation: conversationForAssistant,
      });

      if (isNewChat && !initialThreadId) {
        window.history.replaceState(null, "", `/mgapp/${ensuredThreadId}`);
      }
    } catch (error: unknown) {
      toast.error(t("toast.sendMessageFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
      setInputMessage(cleanMessage);
    } finally {
      setIsGenerating(false);
      setIsSubmitting(false);
    }
  }, [
    inputMessage,
    ensureThread,
    saveMessage,
    runAssistantResponse,
    isNewChat,
    initialThreadId,
    messages,
    t,
  ]);

  const handleThreadSelect = useCallback(
    (targetId: string) => {
      if (targetId === activeThreadId) return;
      router.push(`/mgapp/${targetId}`);
    },
    [activeThreadId, router]
  );

  const handleStartNewChat = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
    setInputMessage("");
    setIsGenerating(false);
    setIsSubmitting(false);

    if (window.location.pathname !== "/mgapp") {
      window.history.replaceState(null, "", "/mgapp");
    }
    router.push("/mgapp");
  }, [router]);

  const isEmpty = useMemo(
    () => !messagesLoading && messages.length === 0 && !isGenerating,
    [messagesLoading, messages.length, isGenerating]
  );

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
  }, []);

  const isBusy = isGenerating || isSubmitting;

  const handleRenameThread = useCallback(
    async (threadId: string, newTitle: string) => {
      try {
        await updateThread(threadId, { title: newTitle });
        queryClient.setQueryData(
          ["mgapp-threads"],
          (prev: ThreadListItem[] | undefined) =>
            (prev ?? []).map((t) =>
              t.id === threadId ? { ...t, title: newTitle } : t
            )
        );
      } catch (error: unknown) {
        toast.error("Failed to rename thread", {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [queryClient]
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      try {
        await deleteThread(threadId);
        queryClient.setQueryData(
          ["mgapp-threads"],
          (prev: ThreadListItem[] | undefined) =>
            (prev ?? []).filter((t) => t.id !== threadId)
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
    [queryClient, activeThreadId, handleStartNewChat]
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
