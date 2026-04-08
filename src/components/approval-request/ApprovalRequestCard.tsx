"use client";

import { useAuth } from "@/hooks/useAuth";
import { ApprovalRequest } from "@/types/approvalRequest";
import { format } from "date-fns";
import { Calendar, FileText, MessageSquare, Paperclip, FileEdit, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";

import { ApprovalActions } from "./approval-actions";
import { ApprovalActionInfo } from "@/service/approvalRequest/approvalRequest";
import { TakeActionDialog } from "@/app/dashboard/_components/take-action-dialog";
import { useState } from "react";

interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  onUpdate?: () => void;
  approvalAction?: ApprovalActionInfo;
}

export function ApprovalRequestCard({
  request,
  onUpdate,
  approvalAction,
}: ApprovalRequestCardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [takeActionOpen, setTakeActionOpen] = useState(false);

  const isPending = request.status === "pending";
  const isOwner = user?.id === request.user_id;
  const isAdmin = user?.user_metadata?.role === "admin" || user?.user_metadata?.role === "platform_admin";
  const isEscalated = request.is_escalated && isPending;

  // Helpers for status styles
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 hover:bg-green-100/80";
      case "rejected":
        return "bg-red-100 text-red-700 hover:bg-red-100/80";
      case "pending":
        return "bg-amber-100 text-amber-700 hover:bg-amber-100/80";
      case "need_revision":
        return "bg-orange-100 text-orange-700 hover:bg-orange-100/80";
      case "draft":
        return "bg-slate-100 text-slate-600 hover:bg-slate-100/80";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-100/80";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return t("status.approved");
      case "rejected":
        return t("status.rejected");
      case "pending":
        return t("status.pending");
      case "need_revision":
        return t("status.needRevision");
      case "cancelled":
        return t("status.cancelled");
      case "draft":
        return t("status.draft");
      default:
        return status;
    }
  };

  const formattedAmount = request.amount ? formatCurrency(request.amount) : "-";

  return (
    <>
    <Card
      className={`w-full overflow-hidden transition-all duration-200 border-t-4 p-0 ${
        request.is_escalated && request.status === "pending"
          ? "border-t-red-500"
          : request.status === "draft"
          ? "border-t-slate-400"
          : request.status === "approved"
          ? "border-t-green-500"
          : request.status === "rejected"
          ? "border-t-red-500"
          : "border-t-amber-500"
      }`}
    >
      <CardHeader className="px-5 pt-5">
        <div className="flex items-start md:items-center flex-col md:flex-row gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                request.is_escalated && request.status === "pending"
                  ? "bg-red-50 text-red-600"
                  : request.status === "draft"
                  ? "bg-slate-50 text-slate-500"
                  : request.status === "approved"
                  ? "bg-green-50 text-green-600"
                  : request.status === "rejected"
                  ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {request.is_escalated && request.status === "pending" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="">
              <h3 className="font-semibold text-lg leading-none text-gray-900 truncate max-w-[200px] sm:max-w-none">
                {request.title}
              </h3>
              {/* <p className="text-sm text-gray-500 uppercase tracking-wider">
                {request.id.slice(0, 8)}{" "}
              </p> */}
            </div>
          </div>
          <Badge
            className={`${getStatusColor(
              request.status
            )} border-none px-3 py-1`}
          >
            {getStatusLabel(request.status)}
          </Badge>
          {request.is_escalated && request.status === "pending" && (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100/80 border-none px-3 py-1">
              {t("escalation.badge")}
            </Badge>
          )}
        </div>
      </CardHeader>

      {request.is_escalated && request.status === "pending" && (
        <div className="mx-5 mb-2 bg-red-50 rounded-lg px-5 py-3">
          <p className="text-sm font-semibold text-gray-900">
            {t("escalation.approvalTimeout")}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            {t("escalation.timeoutMessage", {
              title: request.title,
              step: request.current_step_order || 1,
            })}
          </p>
        </div>
      )}

      <CardContent className="px-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-100 px-5 py-2.5 rounded-md">
            <p className="text-xs font-medium text-gray-400 mb-1">
              {t("approval.vendor")}
            </p>
            <p
              className="font-medium text-gray-900 text-sm truncate"
              title={request.vendor_name || "-"}
            >
              {request.vendor_name || "-"}
            </p>
          </div>
          <div className="bg-gray-100 px-5 py-2.5 rounded-md">
            <p className="text-xs font-medium text-gray-400 mb-1">
              {t("approval.amount")}
            </p>
            <p
              className="font-medium text-gray-900 text-sm truncate"
              title={formattedAmount}
            >
              {formattedAmount}
            </p>
          </div>
          <div className="bg-gray-100 px-5 py-2.5 rounded-md">
            <p className="text-xs font-medium text-gray-400 mb-1">
              {t("approval.category")}
            </p>
            <p
              className="font-medium text-gray-900 text-sm truncate"
              title={request.category || "-"}
            >
              {request.category || "-"}
              {request.category_type?.name && (
                <span className="text-gray-500 font-normal"> / {request.category_type.name}</span>
              )}
            </p>
          </div>
          <div className="bg-gray-100 px-5 py-2.5 rounded-md">
            <p className="text-xs font-medium text-gray-400 mb-1">
              {t("approval.priority")}
            </p>
            <p
              className={`font-medium text-sm capitalize ${
                request.priority?.toLowerCase() === "high"
                  ? "text-red-600"
                  : request.priority?.toLowerCase() === "medium"
                  ? "text-amber-600"
                  : "text-gray-900"
              }`}
            >
              {request.priority || "-"}
            </p>
          </div>
        </div>

        <div className="bg-gray-100 px-5 py-2.5 rounded-md">
          <p className="text-xs font-medium text-gray-400 mb-1">
            {t("approval.description")}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {request.description || t("approval.noDescription")}
          </p>
        </div>

        {approvalAction?.canApprove && isPending && (
          <div className="mt-6 flex w-full">
            <ApprovalActions
              id={request.id}
              onSuccess={onUpdate}
              buttonClassName="flex-1 border-none shadow-none h-10"
              className="w-full"
              hasRoute={approvalAction.hasRoute}
              currentStepName={approvalAction.currentStepName}
              currentStepOrder={approvalAction.currentStepOrder}
              totalSteps={approvalAction.totalSteps}
            />
          </div>
        )}
        {/* Admin escalation actions — Take Action button for proxy approve / re-assign */}
        {isAdmin && isPending && !approvalAction?.canApprove && (
          <div className="mt-4 flex gap-3 w-full">
            {isEscalated && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {/* Reject handled via approval-actions */}}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                {t("action.reject")}
              </Button>
            )}
            <Button
              className={`flex-1 ${isEscalated ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/90"} text-white`}
              onClick={() => setTakeActionOpen(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              {t("escalation.takeAction")}
            </Button>
          </div>
        )}
        {isOwner && request.status === "need_revision" && (
          <Link
            href={`/approval-requests/${request.id}`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <FileEdit className="w-4 h-4" />
            {t("approval.needRevision.revise")}
          </Link>
        )}
      </CardContent>

      <Separator className="bg-gray-100" />

      <CardFooter className="px-5 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-gray-500 gap-4 sm:gap-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {request.date
              ? format(new Date(request.date), "MMMM d, yyyy")
              : "-"}
          </div>
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            <span>
              {t("approval.filesAttached", {
                count: request.documents?.length || 0,
              })}
            </span>
          </div>
        </div>

        <Link
          href={`/approval-requests/${request.id}`}
          className="flex items-center gap-2 text-primary cursor-pointer hover:text-primary/80 transition-colors w-full sm:w-auto justify-end sm:justify-start"
        >
          <span>{t("approval.viewDetails")}</span>
          <MessageSquare className="w-4 h-4 ml-1" />
        </Link>
      </CardFooter>

      {/* Feedback/Status Message Banner based on status (as seen in screenshots) */}
      {request.status === "approved" && (
        <div className="bg-emerald-50 px-6 py-3 border-t border-emerald-100">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
            <div>
              <p className="text-sm font-medium text-gray-900">Manager A</p>
              <p className="text-sm text-gray-600">
                {request.approval_notes || "Approved."}
              </p>
            </div>
          </div>
        </div>
      )}
      {request.status === "rejected" && (
        <div className="bg-red-50 px-6 py-3 border-t border-red-100">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {request.rejector
                  ? `${request.rejector.first_name || ""} ${request.rejector.last_name || ""}`.trim()
                  : ""}
              </p>
              <p className="text-sm text-gray-600">
                {request.approval_notes || "Rejected."}
              </p>
            </div>
          </div>
        </div>
      )}
      {request.status === "need_revision" && request.approval_notes && (
        <div className="bg-amber-50 px-6 py-3 border-t border-amber-100">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {request.rejector
                  ? `${request.rejector.first_name || ""} ${request.rejector.last_name || ""}`.trim()
                  : ""}
              </p>
              <p className="text-sm text-gray-600">
                {request.approval_notes}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>

    {isAdmin && isPending && (
      <TakeActionDialog
        open={takeActionOpen}
        onOpenChange={setTakeActionOpen}
        request={request}
        onSuccess={onUpdate}
      />
    )}
    </>
  );
}
