"use client";

import { useEffect, useRef } from "react";
import {
  HelpCircle,
  Loader2,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { MgappThreadSidebar } from "./MgappThreadSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMgappWorkspace } from "@/components/mgapp/hooks/useMgappWorkspace";
import { useLanguage } from "@/providers/LanguageProvider";

type MgappChatClientProps = {
  threadId?: string;
  isNewChat?: boolean;
};

const EXAMPLE_QUESTIONS = [
  {
    labelKey: "mgapp.example.documentRetention" as const,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    labelKey: "mgapp.example.cannotConnectKKB" as const,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    labelKey: "mgapp.example.ptoApplication" as const,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export function MgappChatClient({
  threadId,
  isNewChat = false,
}: MgappChatClientProps) {
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
  } = useMgappWorkspace({ initialThreadId: threadId, isNewChat });

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
        <MgappThreadSidebar
          {...sidebarProps}
          className="h-full rounded-none border-none shadow-none"
        />
      }
    >
      <div className="bg-white p-5 pb-0 h-full">
        <div className="flex flex-col h-full bg-[#EFF3F6] rounded-t-2xl relative">
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
                  <div className="mb-8 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow mb-4">
                      <HelpCircle className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h3 className="text-slate-400 text-base mb-1">
                      {t("mgapp.greeting")}
                    </h3>
                    <h1 className="text-3xl font-bold text-slate-800">
                      {t("mgapp.howCanIHelp")}
                    </h1>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl w-full px-4">
                    {EXAMPLE_QUESTIONS.map((q) => (
                      <button
                        key={q.labelKey}
                        onClick={() => setInputMessage(t(q.labelKey))}
                        className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200 hover:bg-sky-100/50 hover:border-sky-200 transition-all text-left h-full group"
                      >
                        <div
                          className={`w-8 h-8 ${q.iconBg} rounded-lg flex items-center justify-center mb-3`}
                        >
                          <HelpCircle className={`w-4 h-4 ${q.iconColor}`} />
                        </div>
                        <span className="text-slate-700 font-medium text-base leading-snug">
                          {t(q.labelKey)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages
                .filter((m) => !(m.role === "assistant" && m.content === ""))
                .map((message) => (
                  <ChatMessage key={message.id} {...message} />
                ))}

              {isProcessing &&
                !isSubmitting &&
                !messages.some(
                  (m) => m.id.startsWith("streaming-") && m.content
                ) && (
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
          </section>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-[#EFF3F6] via-[#EFF3F6] to-transparent">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                <div className="flex items-end gap-2 p-2">
                  <Textarea
                    placeholder={t("mgapp.placeholder")}
                    value={inputMessage}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
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
                      disabled={isBusy || !inputMessage.trim()}
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
