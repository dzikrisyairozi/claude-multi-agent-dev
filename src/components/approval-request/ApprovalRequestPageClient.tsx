"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { ApprovalRequest } from "@/types/approvalRequest";
import { IFileMetadata } from "@/types/file";
import { ApprovalRequestDetail } from "@/components/approval-request/approval-request-detail";
import { ApprovalRequestItems } from "@/components/approval-request/approval-request-items";
import { ApprovalActions } from "@/components/approval-request/approval-actions";
import { ApprovalRequestFileCard } from "@/components/approval-request/ApprovalRequestFileCard";
import { ApprovalRequestOptions } from "@/components/approval-request/ApprovalRequestOptions";
import { ApprovalRouteTimeline } from "@/components/approval-request/ApprovalRouteTimeline";
import { ApprovalActivityFeed } from "@/components/approval-request/ApprovalActivityFeed";
import { useSubmissionActivityLogs } from "@/hooks/approval-request/useSubmissionActivityLogs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  FileEdit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { SubmissionDialog } from "@/components/approval-request/SubmissionDialog";
import { addSubmissionComment } from "@/service/approvalRequest/approvalRequest";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, MessageSquare, AlertTriangle } from "lucide-react";
import { TakeActionDialog } from "@/app/dashboard/_components/take-action-dialog";
import { useAuth } from "@/hooks/useAuth";

interface ApprovalRequestPageClientProps {
  request: ApprovalRequest;
  isOwner: boolean;
  isManagerOrPlatformAdmin: boolean;
  canApprove: boolean;
  currentStepName: string | null;
  currentStepOrder: number | null;
  totalSteps: number;
  attachedFiles: IFileMetadata[];
  id: string;
}

export default function ApprovalRequestPageClient({
  request,
  isOwner,
  canApprove,
  currentStepName,
  currentStepOrder,
  totalSteps,
  attachedFiles,
  id,
}: ApprovalRequestPageClientProps) {
  const { t } = useLanguage();
  const { data: activityLogs, isLoading: logsLoading, refetch: refetchLogs } =
    useSubmissionActivityLogs(request.id);
  const { user } = useAuth();
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [takeActionOpen, setTakeActionOpen] = useState(false);
  const isAdmin = user?.user_metadata?.role === "admin" || user?.user_metadata?.role === "platform_admin";
  const isEscalated = request.is_escalated && request.status === "pending";
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  const isNeedRevision = request.status === "need_revision";
  const revisionApproverName =
    request.rejector
      ? `${request.rejector.first_name || ""} ${request.rejector.last_name || ""}`.trim()
      : null;

  const handleReplyComment = async () => {
    if (!replyText.trim()) return;
    setReplySending(true);
    const { error } = await addSubmissionComment(request.id, replyText.trim());
    setReplySending(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Comment added");
      setReplyText("");
      setReplyDialogOpen(false);
      refetchLogs();
    }
  };

  return (
    <>
    <MainLayout>
      <div className="flex flex-col h-full bg-[#F8F9FA] min-h-screen">
        {/* Header/Tabs Section */}
        <div className="bg-white border-b px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto w-full">
            {/* Header with Breadcrumb and Edit Button */}
            <div className="flex flex-row md:items-start justify-between mb-6 gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <Link
                  href="/dashboard"
                  className="hover:text-slate-600 transition-colors"
                >
                  {t("approval.dashboard")}
                </Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-600 truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">
                  {request.title || `REQ-${request.id.slice(0, 8)}`}
                </span>
              </div>
              <ApprovalRequestOptions request={request} isOwner={isOwner} />
            </div>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="bg-slate-50 border border-slate-100 p-1.5 h-auto w-full flex flex-row overflow-x-auto justify-start md:justify-start gap-2">
                <TabsTrigger
                  value="details"
                  className="px-4 md:px-8 py-2.5 data-[state=active]:bg-[#E1F5FE] data-[state=active]:text-[#039BE5] rounded-md transition-all shadow-none gap-2 font-bold text-slate-400 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  {t("approval.details")}
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="px-4 md:px-8 py-2.5 data-[state=active]:bg-[#E1F5FE] data-[state=active]:text-[#039BE5] rounded-md transition-all shadow-none gap-2 font-bold text-slate-400 whitespace-nowrap"
                >
                  <Paperclip className="w-4 h-4" />
                  {t("approval.files")} ({attachedFiles.length})
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="px-4 md:px-8 py-2.5 data-[state=active]:bg-[#E1F5FE] data-[state=active]:text-[#039BE5] rounded-md transition-all shadow-none gap-2 font-bold text-slate-400 whitespace-nowrap"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {t("approval.timeline")}
                </TabsTrigger>
              </TabsList>

              <div className="mt-8">
                <TabsContent
                  value="details"
                  className="space-y-8 mt-0 border-none outline-none"
                >
                  {/* Escalation Banner */}
                  {isEscalated && isAdmin && (
                    <div className="p-4 rounded-xl border bg-red-100 border-red-200 text-red-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-white/50">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide">
                            {t("escalation.badge")}
                          </p>
                          <p className="text-xs opacity-80">
                            {t("escalation.waitingManagerApproval")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          {t("action.reject")}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                          onClick={() => setTakeActionOpen(true)}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          {t("escalation.takeAction")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Status Banner (Subtle) */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      request.status === "draft"
                        ? "bg-slate-50 border-slate-200 text-slate-600"
                        : request.status === "approved"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : request.status === "rejected"
                          ? "bg-red-50 border-red-100 text-red-700"
                          : "bg-orange-100 border-orange-100 text-orange-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-white/50">
                        {request.status === "draft" ? (
                          <FileEdit className="w-5 h-5" />
                        ) : request.status === "approved" ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : request.status === "rejected" ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide">
                          {t("approval.statusLabel", {
                            status:
                              request.status === "draft" ? t("approval.status.draft")
                              : request.status === "pending" ? t("approval.status.pending")
                              : request.status === "approved" ? t("approval.status.approved")
                              : request.status === "rejected" ? t("approval.status.rejected")
                              : request.status === "need_revision" ? t("approval.status.need_revision")
                              : request.status === "cancelled" ? t("approval.status.cancelled")
                              : request.status,
                          })}
                        </p>
                        <p className="text-xs opacity-80">
                          {request.status === "draft"
                            ? t("approval.draftNotSubmitted")
                            : request.status === "need_revision"
                            ? t("approval.needRevision.description", {
                                name: revisionApproverName || t("approval.approver"),
                              })
                            : request.status === "pending"
                            ? t("approval.waitingManager")
                            : t("approval.processedBy", {
                                name:
                                  request.status === "approved"
                                    ? request.approver?.first_name ||
                                      t("approval.approver")
                                    : request.rejector?.first_name ||
                                      t("approval.approver"),
                              })}
                        </p>
                      </div>
                    </div>
                    {request.status === "pending" && canApprove && (
                      <ApprovalActions
                        id={id}
                        currentStepName={currentStepName}
                        currentStepOrder={currentStepOrder}
                        totalSteps={totalSteps}
                        hasRoute={!!request.route_id}
                        className="w-full md:w-fit"
                        buttonClassName="w-full md:w-auto"
                      />
                    )}
                    {isNeedRevision && isOwner && (
                      <Button
                        onClick={() => setReviseDialogOpen(true)}
                        className="bg-sky-500 hover:bg-sky-600 text-white gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {t("approval.needRevision.resubmit")}
                      </Button>
                    )}
                  </div>

                  {/* Comment Card — shows for need_revision, rejected, or approved when notes exist */}
                  {["need_revision", "rejected", "approved"].includes(request.status) && (() => {
                    // Get notes from request.approval_notes or from the last acted step
                    const lastActedStep = [...(request.step_approvals || [])]
                      .filter((s) => s.acted_at && s.notes)
                      .sort((a, b) => new Date(b.acted_at!).getTime() - new Date(a.acted_at!).getTime())[0];
                    const commentText = request.approval_notes || lastActedStep?.notes;
                    if (!commentText) return null;

                    const commentAuthor =
                      request.status === "approved"
                        ? lastActedStep?.actor
                          ? `${lastActedStep.actor.first_name || ""} ${lastActedStep.actor.last_name || ""}`.trim()
                          : `${request.approver?.first_name || ""}`.trim() || t("approval.approver")
                        : revisionApproverName || lastActedStep?.actor
                          ? `${(lastActedStep?.actor?.first_name || "")} ${(lastActedStep?.actor?.last_name || "")}`.trim()
                          : t("approval.approver");
                    const borderColor =
                      request.status === "rejected" ? "border-red-200" :
                      request.status === "approved" ? "border-emerald-200" :
                      "border-amber-200";
                    const bgColor =
                      request.status === "rejected" ? "bg-red-50" :
                      request.status === "approved" ? "bg-emerald-50" :
                      "bg-amber-50";
                    const iconColor =
                      request.status === "rejected" ? "text-red-500" :
                      request.status === "approved" ? "text-emerald-500" :
                      "text-amber-600";
                    return (
                      <div className={`p-4 rounded-xl border ${borderColor} ${bgColor} flex flex-col md:flex-row items-start md:items-center justify-between gap-3`}>
                        <div className="flex items-start gap-3">
                          <MessageSquare className={`w-5 h-5 ${iconColor} mt-0.5 shrink-0`} />
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {t("approval.needRevision.commentFrom", { name: commentAuthor || t("approval.approver") })}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">
                              {commentText}
                            </p>
                          </div>
                        </div>
                        {isNeedRevision && isOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0"
                            onClick={() => setReplyDialogOpen(true)}
                          >
                            {t("approval.needRevision.replyComment")}
                          </Button>
                        )}
                      </div>
                    );
                  })()}

                  <div className="bg-white p-4 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-10">
                    <ApprovalRequestDetail data={request} />
                    <ApprovalRequestItems data={request} />
                  </div>
                </TabsContent>

                <TabsContent
                  value="files"
                  className="mt-0 border-none outline-none"
                >
                  <Card className="border-slate-200 rounded-2xl shadow-sm overflow-hidden p-0">
                    <CardHeader className="bg-white border-b px-8 py-6">
                      <CardTitle className="text-xl font-bold text-slate-700">
                        {t("approval.attachedFiles.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {attachedFiles.map((file) => (
                          <ApprovalRequestFileCard key={file.id} file={file} />
                        ))}
                        {attachedFiles.length === 0 && (
                          <div className="col-span-full text-center py-20 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            {t("approval.noFiles")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="timeline"
                  className="mt-0 border-none outline-none"
                >
                  <Card className="border-slate-200 rounded-2xl shadow-sm overflow-hidden p-0">
                    <CardHeader className="bg-white border-b px-8 py-6">
                      <CardTitle className="text-xl font-bold text-slate-700">
                        {t("approval.timeline.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 space-y-8">
                      <ApprovalRouteTimeline
                        status={request.status as "draft" | "pending" | "approved" | "rejected" | "need_revision" | "cancelled"}
                        stepApprovals={request.step_approvals}
                        revisionSourceStepOrder={request.revision_source_step_order}
                        revisionRestartFromFirst={request.revision_restart_from_first}
                      />
                      <ApprovalActivityFeed
                        request={request}
                        logs={activityLogs ?? []}
                        isLoading={logsLoading}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Revise / Resubmit Dialog */}
      {isOwner && (
        <SubmissionDialog
          open={reviseDialogOpen}
          onOpenChange={setReviseDialogOpen}
          initialData={request}
          onSuccess={() => {
            setReviseDialogOpen(false);
            window.location.reload();
          }}
        />
      )}

      {/* Reply Comment Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("approval.needRevision.replyComment")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t("action.commentPlaceholder")}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplyDialogOpen(false)}
              disabled={replySending}
            >
              {t("action.cancel")}
            </Button>
            <Button
              onClick={handleReplyComment}
              disabled={replySending || !replyText.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {t("approval.needRevision.replyComment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>

    {isAdmin && request.status === "pending" && (
      <TakeActionDialog
        open={takeActionOpen}
        onOpenChange={setTakeActionOpen}
        request={request}
      />
    )}
    </>
  );
}
