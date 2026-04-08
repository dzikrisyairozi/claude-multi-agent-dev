"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function ChatFAB() {
  return (
    <Link
      href="/c"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-[70px] h-[70px] rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 bg-figma-primary"
      aria-label="Open Chat"
    >
      <MessageCircle className="h-[30px] w-[30px] text-white" />
    </Link>
  );
}
