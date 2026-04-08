"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApprovalRequest } from "@/types/approvalRequest";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";

interface ApprovalRequestItemsProps {
  data: ApprovalRequest;
}

export function ApprovalRequestItems({ data }: ApprovalRequestItemsProps) {
  const { t } = useLanguage();
  const items = data.items || [];
  const subtotal = items.reduce(
    (acc, item) => acc + item.quantity * item.amount,
    0,
  );

  const taxRate = data.tax_rate || 0.1; // Default to 10% if not specified
  const taxAmount = data.is_use_tax
    ? data.is_tax_included
      ? (subtotal * taxRate) / (1 + taxRate)
      : subtotal * taxRate
    : 0;
  const grandTotal =
    data.is_use_tax && !data.is_tax_included ? subtotal + taxAmount : subtotal;

  return (
    <Card className="border border-slate-200 overflow-hidden p-0">
      <CardHeader className="bg-white px-5 pt-5">
        <CardTitle className="text-xl font-bold text-slate-700">
          {t("submission.items.label")}
        </CardTitle>
        <p className="text-sm text-slate-400">
          {t("submission.items.sublabel")}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {t("submission.items.header.name")}
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">
                  {t("submission.items.header.qty")}
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">
                  {t("submission.items.header.price")}
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">
                  {t("submission.items.header.total")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={index}
                  className="border-b last:border-0 hover:bg-slate-50/50"
                >
                  <TableCell className="px-6 py-4 font-medium text-slate-700 min-w-[200px]">
                    {item.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-slate-700 whitespace-nowrap">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right text-slate-700 whitespace-nowrap">
                    {formatCurrency(item.amount)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-semibold text-slate-700 whitespace-nowrap">
                    {formatCurrency(item.quantity * item.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-slate-400"
                  >
                    {t("table.noItems")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals Section */}
        <div className="px-6 py-4 space-y-2 border-t bg-slate-50/30">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">
              {t("submission.total.subtotal")}
            </span>
            <span className="font-bold text-slate-700">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">
              {t("submission.total.taxAmount")} ({taxRate * 100}%)
            </span>
            <span className="font-bold text-slate-700">
              {formatCurrency(taxAmount)}
            </span>
          </div>
        </div>

        {/* Grand Total Bar */}
        <div className="bg-[#4FC3F7] px-6 py-4 flex justify-between items-center text-white">
          <span className="font-bold uppercase tracking-wider text-sm">
            {t("submission.total.grand")}
          </span>
          <span className="text-xl font-bold">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
