"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getUserDataStats } from "@/service/devTools/getUserDataStats";
import { resetUserData } from "@/service/devTools/resetUserData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  MessageSquare,
  FileText,
  FolderOpen,
  ClipboardList,
  Activity,
  Layers,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import type { UserDataStats, ResetResult } from "@/types/devTools";

const isDevToolsEnabled = process.env.NEXT_PUBLIC_DEV_TOOLS === "true";

export default function DevToolsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserDataStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [currentStep, setCurrentStep] = useState("");

  useEffect(() => {
    if (!isDevToolsEnabled) {
      router.replace("/");
    } else if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [router, user, authLoading]);

  async function fetchStats() {
    setStatsLoading(true);
    const { data, error } = await getUserDataStats();
    if (!error && data) setStats(data);
    setStatsLoading(false);
  }

  async function handleReset() {
    setResetting(true);
    setResetResult(null);
    setCurrentStep("Deleting all data and S3 files...");

    const { data, error } = await resetUserData();

    if (error) {
      setResetResult({
        success: false,
        deleted: {
          approval_requests: 0,
          documents: 0,
          threads: 0,
          folders: 0,
          activity_logs: 0,
          s3_files: 0,
        },
        errors: [error],
      });
    } else if (data) {
      setResetResult(data);
    }

    setCurrentStep("");
    setResetting(false);
    await fetchStats();
  }

  if (!isDevToolsEnabled) {
    return null;
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statItems = stats
    ? [
        { label: "Threads", value: stats.threads, icon: MessageSquare },
        { label: "Messages", value: stats.messages, icon: MessageSquare },
        { label: "Documents", value: stats.documents, icon: FileText },
        { label: "Embeddings", value: stats.embeddings, icon: Layers },
        {
          label: "Approval Requests",
          value: stats.approval_requests,
          icon: ClipboardList,
        },
        { label: "Folders", value: stats.folders, icon: FolderOpen },
        {
          label: "Activity Logs",
          value: stats.activity_logs,
          icon: Activity,
        },
      ]
    : [];

  return (
    <MainLayout>
    <div className="container mx-auto max-w-4xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Developer Tools</h1>
        <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Development only. This page resets <strong>ALL users&apos; data</strong> globally. Not for production.
          </span>
        </div>
      </div>

      {/* Stats Section */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Current Data Counts
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={statsLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${statsLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {statItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Section */}
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Reset All Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will delete all threads, messages, documents, embeddings,
            approval requests, folders, activity logs, and S3 files.
            User profiles are preserved.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={resetting}>
                {resetting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset All Data
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL data across ALL users:
                  threads, messages, documents, embeddings, approval requests,
                  folders, activity logs, and S3 files. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Progress */}
          {resetting && currentStep && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentStep}
            </div>
          )}

          {/* Result */}
          {resetResult && (
            <div
              className={`rounded-lg border p-4 ${
                resetResult.success
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {resetResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
                <span className="font-medium">
                  {resetResult.success
                    ? "Reset completed successfully"
                    : "Reset completed with errors"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div>
                  Approval Requests:{" "}
                  <strong>{resetResult.deleted.approval_requests}</strong>
                </div>
                <div>
                  Documents:{" "}
                  <strong>{resetResult.deleted.documents}</strong>
                </div>
                <div>
                  Threads: <strong>{resetResult.deleted.threads}</strong>
                </div>
                <div>
                  Folders: <strong>{resetResult.deleted.folders}</strong>
                </div>
                <div>
                  Activity Logs:{" "}
                  <strong>{resetResult.deleted.activity_logs}</strong>
                </div>
                <div>
                  S3 Files: <strong>{resetResult.deleted.s3_files}</strong>
                </div>
              </div>

              {resetResult.errors.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                    Errors:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {resetResult.errors.map((err, i) => (
                      <li key={i}>- {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </MainLayout>
  );
}
