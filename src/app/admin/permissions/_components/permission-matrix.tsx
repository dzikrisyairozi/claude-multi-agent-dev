"use client";

import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import {
  getPermissionMatrix,
  updateRolePermission,
} from "@/service/admin/permission";
import { PermissionMatrixRow, PermissionValue } from "@/types/permission";
import { useLanguage } from "@/providers/LanguageProvider";

const ROLES = ["approver", "requester", "accounting", "admin", "platform_admin"] as const;

const ROLE_LABELS: Record<string, string> = {
  approver: "Approver",
  requester: "Requester",
  accounting: "Accounting",
  admin: "Admin",
  platform_admin: "Platform Admin",
};

const CATEGORY_LABELS: Record<string, string> = {
  submission: "Submission",
  approval: "Approval Actions",
  route_config: "Approval Route Configuration",
  reports: "Reports & Audit",
  system: "System Configuration",
};

const PERMISSION_OPTIONS: { value: PermissionValue; label: string }[] = [
  { value: "granted", label: "Granted" },
  { value: "denied", label: "Denied" },
  { value: "assigned_only", label: "Assigned Only" },
  { value: "limited", label: "Limited" },
  { value: "view_only", label: "View Only" },
];

function getPermissionBadgeClass(value: PermissionValue): string {
  switch (value) {
    case "granted":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case "denied":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "assigned_only":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "limited":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "view_only":
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700";
    default:
      return "";
  }
}

function getPermissionLabel(value: PermissionValue): string {
  const option = PERMISSION_OPTIONS.find((o) => o.value === value);
  return option?.label ?? value;
}

function groupByCategory(rows: PermissionMatrixRow[]) {
  const groups: Record<string, PermissionMatrixRow[]> = {};
  for (const row of rows) {
    if (!groups[row.category]) groups[row.category] = [];
    groups[row.category].push(row);
  }
  return groups;
}

export function PermissionMatrix() {
  const { t } = useLanguage();
  // Track optimistic overrides: key = "permissionId:role", value = new PermissionValue
  const [overrides, setOverrides] = useState<Record<string, PermissionValue>>({});

  const {
    data: result,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["permission-matrix"],
    queryFn: getPermissionMatrix,
  });

  const matrixData = useMemo(() => {
    const base = result?.data ?? [];
    if (Object.keys(overrides).length === 0) return base;
    return base.map((row) => {
      let patched = false;
      const newValues = { ...row.values };
      for (const role of ROLES) {
        const key = `${row.permissionId}:${role}`;
        if (key in overrides) {
          newValues[role] = overrides[key];
          patched = true;
        }
      }
      return patched ? { ...row, values: newValues } : row;
    });
  }, [result?.data, overrides]);

  const handlePermissionChange = async (
    permissionId: string,
    role: string,
    newValue: PermissionValue
  ) => {
    const overrideKey = `${permissionId}:${role}`;
    // Optimistically apply override
    setOverrides((prev) => ({ ...prev, [overrideKey]: newValue }));

    const { error: updateError } = await updateRolePermission({
      role: role as "approver" | "requester" | "accounting" | "admin" | "platform_admin",
      permissionId,
      permission: newValue,
    });

    if (updateError) {
      // Revert optimistic override on error
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[overrideKey];
        return next;
      });
      toast.error(t("permissions.updateError"), {
        description: updateError,
      });
    } else {
      // Clear override now that server is in sync
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[overrideKey];
        return next;
      });
      toast.success(t("permissions.updateSuccess"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error || result?.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("permissions.error")}</AlertTitle>
        <AlertDescription>
          {result?.error || t("permissions.failedToLoad")}
        </AlertDescription>
      </Alert>
    );
  }

  const groups = groupByCategory(matrixData);
  const totalColumns = ROLES.length + 1; // action name + roles

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">
              {t("permissions.action")}
            </TableHead>
            {ROLES.map((role) => (
              <TableHead key={role} className="min-w-[140px] text-center">
                {ROLE_LABELS[role]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groups).map(([category, rows]) => (
            <Fragment key={category}>
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  className="bg-muted/50 font-semibold text-sm py-2"
                >
                  {CATEGORY_LABELS[category] ?? category}
                </TableCell>
              </TableRow>
              {rows.map((row) => (
                <TableRow key={row.permissionId}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">
                    {row.name}
                  </TableCell>
                  {ROLES.map((role) => {
                    const value = row.values[role] ?? "denied";
                    return (
                      <TableCell key={role} className="text-center p-1">
                        <Select
                          value={value}
                          onValueChange={(val) =>
                            handlePermissionChange(
                              row.permissionId,
                              role,
                              val as PermissionValue
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px] mx-auto border-0 shadow-none focus:ring-0 justify-center">
                            <Badge
                              variant="outline"
                              className={getPermissionBadgeClass(value)}
                            >
                              {getPermissionLabel(value)}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge
                                  variant="outline"
                                  className={getPermissionBadgeClass(opt.value)}
                                >
                                  {opt.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
