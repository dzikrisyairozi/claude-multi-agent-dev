"use client";

import { ThreadSidebar } from "@/components/chat/ThreadSidebar";
import { ThreadListItem } from "@/types/thread";

interface MgappThreadSidebarProps {
  threads: ThreadListItem[];
  activeThreadId: string;
  isLoading: boolean;
  onSelect: (threadId: string) => void;
  onNewChat: () => void;
  onRename: (threadId: string, newTitle: string) => void;
  onDelete: (threadId: string) => void;
  className?: string;
}

export function MgappThreadSidebar(props: MgappThreadSidebarProps) {
  return <ThreadSidebar {...props} />;
}
