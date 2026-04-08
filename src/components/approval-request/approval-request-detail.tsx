"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalRequest } from "@/types/approvalRequest";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useLanguage } from "@/providers/LanguageProvider";

interface ApprovalRequestDetailProps {
  data: ApprovalRequest;
}

export function ApprovalRequestDetail({ data }: ApprovalRequestDetailProps) {
  const { t } = useLanguage();

  return (
    <Card className="border-none shadow-none p-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl font-bold text-slate-700">
          {t("detail.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Submission Title */}
        <div className="col-span-full bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.submissionTitle")}
          </p>
          <p className="font-bold text-slate-700">{data.title || "-"}</p>
        </div>

        {/* Priority & Department */}
        <div className="bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.priority")}
          </p>
          <p
            className={`font-bold capitalize ${
              data.priority?.toLowerCase() === "high"
                ? "text-red-500"
                : data.priority?.toLowerCase() === "medium"
                  ? "text-amber-500"
                  : "text-slate-700"
            }`}
          >
            {data.priority || "-"}
          </p>
        </div>
        <div className="bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.department")}
          </p>
          <p className="font-bold text-slate-700">{data.department || "-"}</p>
        </div>

        {/* Vendor Name */}
        <div className="col-span-full bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.vendorName")}
          </p>
          <p className="font-bold text-slate-700">{data.vendor_name || "-"}</p>
        </div>

        {/* Category & Total Amount */}
        <div className="bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.category")}
          </p>
          <p className="font-bold text-slate-700">{data.category || "-"}</p>
        </div>
        <div className="bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.totalAmount")}
          </p>
          <p className="font-bold text-slate-700">
            {data.amount ? formatCurrency(data.amount) : "-"}
          </p>
        </div>

        {/* Payment Schedule Date & Payment Method */}
        <div className="bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.paymentScheduleDate")}
          </p>
          <p className="font-bold text-slate-700">
            {data.payment_schedule_date
              ? format(
                  new Date(data.payment_schedule_date),
                  "MMMM d, yyyy",
                )
              : "-"}
          </p>
        </div>
        <div className="bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.paymentMethod")}
          </p>
          <p className="font-bold text-slate-700">
            {data.payment_method || "-"}
          </p>
        </div>

        {/* Required by Date & Submitted By */}
        <div className="bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.requiredByDate")}
          </p>
          <p className="font-bold text-slate-700">
            {data.date
              ? format(new Date(data.date), "MMMM d, yyyy")
              : "-"}
          </p>
        </div>
        <div className="bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.submittedBy")}
          </p>
          <p className="font-bold text-slate-700">
            {data.submitter
              ? `${data.submitter.first_name ?? ""} ${data.submitter.last_name ?? ""}`.trim() || "-"
              : "-"}
          </p>
        </div>

        {/* Reason for Purchase */}
        <div className="col-span-full bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.reasonForPurchase")}
          </p>
          <p className="font-bold text-slate-700">
            {data.reason_for_purchase || "-"}
          </p>
        </div>

        {/* Purpose */}
        <div className="col-span-full bg-slate-50 p-5 rounded-lg space-y-1.5 border border-slate-100/50">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {t("detail.purpose")}
          </p>
          <p className="font-bold text-slate-700">{data.purpose || "-"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
