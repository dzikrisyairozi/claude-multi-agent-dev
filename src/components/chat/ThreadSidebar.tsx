"use client";

import { useState } from "react";
import { Loader2, MessageCirclePlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThreadListItem } from "@/types/thread";
import { useLanguage } from "@/providers/LanguageProvider";
import { ThreadItem } from "@/components/chat/ThreadItem";

interface ThreadSidebarProps {
  threads: ThreadListItem[];
  activeThreadId: string;
  isLoading: boolean;
  onSelect: (threadId: string) => void;
  onNewChat: () => void;
  onRename: (threadId: string, newTitle: string) => void;
  onDelete: (threadId: string) => void;
  className?: string;
}

export function ThreadSidebar({
  threads,
  activeThreadId,
  isLoading,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  className,
}: ThreadSidebarProps) {
  const { t, language } = useLanguage();
  const locale = language === "ja" ? "ja-JP" : "en-US";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredThreads = threads.filter((thread) =>
    (thread.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={cn("flex flex-col h-full p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">
            {t("sidebar.conversations")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("sidebar.subtitle")}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1 bg-primary hover:bg-primary/80 text-white rounded-md px-3"
          onClick={onNewChat}
        >
          <MessageCirclePlus className="h-4 w-4" />
          {t("sidebar.new")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search chats"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border rounded-md"
        />
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto -mx-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("sidebar.loading")}
          </div>
        )}

        {!isLoading && filteredThreads.length === 0 && (
          <p className="text-xs text-muted-foreground px-4">
            {searchQuery ? "No results found" : t("sidebar.empty")}
          </p>
        )}

        <div className="space-y-0.5">
          {filteredThreads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
