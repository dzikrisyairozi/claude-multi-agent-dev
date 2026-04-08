"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Use role from auth metadata — no extra DB query needed
  const role = user?.user_metadata?.role;
  const isAdmin = role === "admin" || role === "platform_admin";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
    } else if (!isAdmin) {
      router.push("/c");
    }
  }, [user, authLoading, isAdmin, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <MainLayout>
      <div className="p-6">{children}</div>
    </MainLayout>
  );
}
