"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { ActivityLogPageClient } from "@/components/activity-log/ActivityLogPageClient";
import { Loader2 } from "lucide-react";

export default function ActivityLogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const userRole = user?.user_metadata?.role;
  const isAdmin = userRole && ["platform_admin", "admin"].includes(userRole);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <MainLayout>
      <ActivityLogPageClient
        variant={isAdmin ? "admin" : "employee"}
        userId={user.id}
      />
    </MainLayout>
  );
}
