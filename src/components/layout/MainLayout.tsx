"use client";

import { Menu, X } from "lucide-react";
import { MainSidebar } from "@/components/layout/MainSidebar";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import {
  MobileMenuProvider,
  useMobileMenu,
} from "@/providers/MobileMenuProvider";

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const { isOpen, close } = useMobileMenu();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <MainSidebar className="hidden lg:flex shrink-0" />

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={close}
          />
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-300">
            <div className="relative h-full">
              <MainSidebar className="flex h-full" />
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

      <div className="flex-1 flex flex-col min-w-0 bg-linear-to-br from-background via-background to-primary/5">
        <Navbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <MobileMenuProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </MobileMenuProvider>
  );
}
