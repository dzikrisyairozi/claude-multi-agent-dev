"use client";

import { X, Search } from "lucide-react";
import { MainSidebar } from "@/components/layout/MainSidebar";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MobileMenuProvider,
  useMobileMenu,
} from "@/providers/MobileMenuProvider";

interface ChatLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

function ChatLayoutContent({ children, sidebar }: ChatLayoutProps) {
  const { isOpen, close } = useMobileMenu();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Main Sidebar (narrow icons) */}
      <MainSidebar className="hidden lg:flex shrink-0" />

      {/* Desktop Conversations Sidebar */}
      {sidebar && (
        <div className="hidden lg:flex w-[280px] shrink-0 border-r bg-white flex-col">
          {sidebar}
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={close}
          />
          {/* Both Sidebars */}
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-300 flex">
            <div className="relative h-full flex">
              <MainSidebar className="flex h-full" />
              {sidebar && (
                <div className="w-[260px] bg-background border-r flex flex-col">
                  {sidebar}
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 -right-10 bg-background rounded-full shadow-md"
                onClick={close}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-linear-to-br from-background via-background to-primary/5">
        <Navbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function ChatLayout({ children, sidebar }: ChatLayoutProps) {
  return (
    <MobileMenuProvider>
      <ChatLayoutContent sidebar={sidebar}>{children}</ChatLayoutContent>
    </MobileMenuProvider>
  );
}
