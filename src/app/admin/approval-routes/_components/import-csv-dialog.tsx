"use client";

import { useRef, useState } from "react";
import { IconDownload, IconFileImport, IconAlertCircle } from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createApprovalRoute } from "@/service/approvalRoute/approvalRoute";
import {
  ApprovalRouteApproverRole,
  ApprovalRouteCategory,
  ApprovalRouteCondition,
  CreateApprovalRouteParams,
  CreateApprovalRouteStepParams,
} from "@/types/approvalRoute";
import { useLanguage } from "@/providers/LanguageProvider";
import { getActivePositions } from "@/service/admin/position";
import { getActiveDepartments } from "@/service/admin/department";
import { getActiveProfiles } from "@/service/admin/user";

// ---------------------------------------------------------------------------
// CSV template content
// ---------------------------------------------------------------------------

// 1 row = 1 route. conditions and steps are JSON strings.
const CSV_TEMPLATE = [
  'route_name,description,is_active,conditions,steps',
  '"Engineering Purchases","For engineering purchases",true,"[{""department"":""Engineering"",""amount_gt"":100000}]","[{""name"":""Manager Review"",""role"":""approver"",""department"":""Engineering""},{""name"":""Director Approval"",""position"":""Department Head"",""department"":""Engineering""}]"',
  '"Finance Contracts","Finance team contracts",true,"[{""category"":""contracts""},{""amount_gt"":50000}]","[{""name"":""Accounting Review"",""role"":""accounting""},{""name"":""CFO Approval"",""members"":""cfo@gmail.com|finance-head@gmail.com""}]"',
].join("\n");

// ---------------------------------------------------------------------------
// CSV parsing utilities
// ---------------------------------------------------------------------------

/** Minimal RFC 4180-compatible row splitter that handles quoted fields. */
function splitCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuote = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (insideQuote && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (ch === "," && !insideQuote) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const VALID_ROLES: ApprovalRouteApproverRole[] = ["approver", "accounting", "admin"];

interface ParseResult {
  routes: CreateApprovalRouteParams[];
  errors: string[];
}

// JSON condition group shape from CSV:
// { department?: string, category?: string, amount_gt?: number, amount_lt?: number }
interface CsvConditionGroup {
  department?: string;
  category?: string;
  amount_gt?: number;
  amount_lt?: number;
}

// JSON step shape from CSV:
// { name: string, role?: string, position?: string, department?: string, members?: string }
interface CsvStep {
  name: string;
  role?: string;
  position?: string;
  department?: string;
  members?: string; // pipe-separated emails
}

interface LookupMaps {
  positionMap: Map<string, string>; // lowercase name → id
  departmentMap: Map<string, string>;
  profileByEmail: Map<string, string>; // lowercase email → id
}

async function buildLookupMaps(): Promise<LookupMaps> {
  const [posRes, deptRes, profRes] = await Promise.all([
    getActivePositions(),
    getActiveDepartments(),
    getActiveProfiles(),
  ]);

  const positionMap = new Map(
    (posRes.data ?? []).map((p) => [p.name.trim().toLowerCase(), p.id])
  );
  const departmentMap = new Map(
    (deptRes.data ?? []).map((d) => [d.name.trim().toLowerCase(), d.id])
  );
  const profileByEmail = new Map(
    (profRes.data ?? []).filter((p) => p.email).map((p) => [p.email!.trim().toLowerCase(), p.id])
  );

  return { positionMap, departmentMap, profileByEmail };
}

function convertConditionGroups(groups: CsvConditionGroup[]): ApprovalRouteCondition | { groups: ApprovalRouteCondition[] } {
  const converted = groups.map((g) => {
    const cond: ApprovalRouteCondition = {};
    if (g.department) cond.departments = [g.department.trim()];
    if (g.category) cond.categories = [g.category.trim().toLowerCase() as ApprovalRouteCategory];
    if (g.amount_gt != null) cond.min_amount = g.amount_gt;
    if (g.amount_lt != null) cond.max_amount = g.amount_lt;
    return cond;
  }).filter((c) => Object.keys(c).length > 0);

  if (converted.length === 0) return {};
  if (converted.length === 1) return converted[0];
  return { groups: converted };
}

function convertSteps(
  csvSteps: CsvStep[],
  lookups: LookupMaps,
  routeName: string,
  errors: string[]
): CreateApprovalRouteStepParams[] {
  return csvSteps.map((s, i) => {
    const step: CreateApprovalRouteStepParams = {
      step_order: i + 1,
      name: s.name.trim(),
    };

    if (s.role) {
      const role = s.role.trim().toLowerCase() as ApprovalRouteApproverRole;
      if (!VALID_ROLES.includes(role)) {
        errors.push(`Route "${routeName}", step "${s.name}": invalid role "${s.role}". Must be: ${VALID_ROLES.join(", ")}.`);
      } else {
        step.approver_role = role;
      }
    }

    if (s.position) {
      const key = s.position.trim().toLowerCase();
      const id = lookups.positionMap.get(key);
      if (!id) {
        errors.push(`Route "${routeName}", step "${s.name}": position "${s.position}" not found.`);
      } else {
        step.approver_position_id = id;
      }
    }

    if (s.department) {
      const key = s.department.trim().toLowerCase();
      const id = lookups.departmentMap.get(key);
      if (!id) {
        errors.push(`Route "${routeName}", step "${s.name}": department "${s.department}" not found.`);
      } else {
        step.approver_department_id = id;
      }
    }

    if (s.members) {
      const emails = s.members.split("|").map((e) => e.trim().toLowerCase()).filter(Boolean);
      const ids: string[] = [];
      for (const email of emails) {
        const id = lookups.profileByEmail.get(email);
        if (!id) {
          errors.push(`Route "${routeName}", step "${s.name}": member "${email}" not found.`);
        } else {
          ids.push(id);
        }
      }
      if (ids.length > 0) step.assignee_user_ids = ids;
    }

    return step;
  });
}

async function parseCSV(text: string): Promise<ParseResult> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    return { routes: [], errors: ["CSV has no data rows."] };
  }

  const header = splitCsvRow(lines[0]).map((h) => h.toLowerCase().trim());
  const requiredHeaders = ["route_name", "steps"];
  const missingHeaders = requiredHeaders.filter((h) => !header.includes(h));
  if (missingHeaders.length > 0) {
    return { routes: [], errors: [`Missing required columns: ${missingHeaders.join(", ")}`] };
  }

  const idx = (col: string) => header.indexOf(col);
  const errors: string[] = [];

  // Build lookup maps from DB
  const lookups = await buildLookupMaps();

  const routes: CreateApprovalRouteParams[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = splitCsvRow(lines[i]);

    const routeName = (cols[idx("route_name")] ?? "").trim();
    if (!routeName) {
      errors.push(`Row ${rowNum}: route_name is required.`);
      continue;
    }

    const description = (cols[idx("description")] ?? "").trim();
    const isActiveRaw = (cols[idx("is_active")] ?? "true").trim().toLowerCase();

    // Parse conditions JSON
    let conditionGroups: CsvConditionGroup[] = [];
    const conditionsRaw = (cols[idx("conditions")] ?? "").trim();
    if (conditionsRaw) {
      try {
        conditionGroups = JSON.parse(conditionsRaw);
        if (!Array.isArray(conditionGroups)) {
          errors.push(`Row ${rowNum}: conditions must be a JSON array.`);
          conditionGroups = [];
        }
      } catch {
        errors.push(`Row ${rowNum}: invalid JSON in conditions column.`);
      }
    }

    // Parse steps JSON
    let csvSteps: CsvStep[] = [];
    const stepsRaw = (cols[idx("steps")] ?? "").trim();
    if (!stepsRaw) {
      errors.push(`Row ${rowNum}: steps is required.`);
      continue;
    }
    try {
      csvSteps = JSON.parse(stepsRaw);
      if (!Array.isArray(csvSteps) || csvSteps.length === 0) {
        errors.push(`Row ${rowNum}: steps must be a non-empty JSON array.`);
        continue;
      }
    } catch {
      errors.push(`Row ${rowNum}: invalid JSON in steps column.`);
      continue;
    }

    // Validate each step has a name
    for (let j = 0; j < csvSteps.length; j++) {
      if (!csvSteps[j].name?.trim()) {
        errors.push(`Row ${rowNum}, step ${j + 1}: name is required.`);
      }
    }

    const conditions = convertConditionGroups(conditionGroups);
    const steps = convertSteps(csvSteps, lookups, routeName, errors);

    routes.push({
      name: routeName,
      description: description || undefined,
      is_active: isActiveRaw !== "false",
      conditions,
      steps,
    });
  }

  return { routes, errors };
}

// ---------------------------------------------------------------------------
// Condition summary helper
// ---------------------------------------------------------------------------

function summarizeConditions(route: CreateApprovalRouteParams): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cond = route.conditions as any;
  if (!cond) return "—";

  const summarizeGroup = (g: ApprovalRouteCondition): string => {
    const parts: string[] = [];
    if (g.departments?.length) parts.push(g.departments.join(", "));
    if (g.categories?.length) parts.push(g.categories.join(", "));
    if (g.min_amount != null) parts.push(`> ¥${g.min_amount.toLocaleString()}`);
    if (g.max_amount != null) parts.push(`< ¥${g.max_amount.toLocaleString()}`);
    return parts.join(" AND ") || "";
  };

  if (cond.groups) {
    return cond.groups.map((g: ApprovalRouteCondition) => `(${summarizeGroup(g)})`).join(" OR ") || "—";
  }
  return summarizeGroup(cond) || "—";
}

// ---------------------------------------------------------------------------
// Props & types
// ---------------------------------------------------------------------------

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Stage = "upload" | "preview" | "importing";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportCsvDialog({ open, onOpenChange, onSuccess }: ImportCsvDialogProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [, setImportErrors] = useState<string[]>([]);

  // Reset state when dialog closes
  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setStage("upload");
      setFileName("");
      setParseResult(null);
      setImportProgress(0);
      setImportErrors([]);
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(value);
  };

  // ---------------------------------------------------------------------------
  // Template download
  // ---------------------------------------------------------------------------

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("approvalRoute.import.templateFilename");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // File selection
  // ---------------------------------------------------------------------------

  const [isParsing, setIsParsing] = useState(false);

  const processFile = async (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    const text = await file.text();
    const result = await parseCSV(text);
    setParseResult(result);
    setStage("preview");
    setIsParsing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith(".csv")) return;
    processFile(file);
  };

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  const handleImport = async () => {
    if (!parseResult || parseResult.routes.length === 0) return;

    setStage("importing");
    setImportProgress(0);
    const errs: string[] = [];

    for (let i = 0; i < parseResult.routes.length; i++) {
      const route = parseResult.routes[i];
      const result = await createApprovalRoute(route);
      if (result.error) {
        errs.push(`"${route.name}": ${result.error}`);
      }
      setImportProgress(i + 1);
    }

    setImportErrors(errs);

    const succeeded = parseResult.routes.length - errs.length;
    if (succeeded > 0) {
      toast.success(
        t("approvalRoute.import.importSuccess").replace("{n}", String(succeeded))
      );
      onSuccess();
    }
    if (errs.length > 0) {
      toast.error(t("approvalRoute.import.importFailed"));
    }

    handleOpenChange(false);
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const totalSteps =
    parseResult?.routes.reduce((sum, r) => sum + r.steps.length, 0) ?? 0;

  const canImport =
    parseResult !== null &&
    parseResult.routes.length > 0 &&
    parseResult.errors.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{t("approvalRoute.import.title")}</DialogTitle>
          <DialogDescription>{t("approvalRoute.import.description")}</DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ---------------------------------------------------------------- */}
          {/* Stage: upload                                                      */}
          {/* ---------------------------------------------------------------- */}
          {stage === "upload" && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isParsing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${isParsing ? "opacity-50 cursor-wait" : "cursor-pointer hover:border-primary/50 hover:bg-muted/30"}`}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <IconFileImport className={`size-6 text-muted-foreground ${isParsing ? "animate-pulse" : ""}`} />
                </div>
                <p className="text-sm font-medium">
                  {isParsing ? "Parsing & resolving names..." : t("approvalRoute.import.uploadLabel")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isParsing ? "Looking up positions, departments, and members from database" : t("approvalRoute.import.uploadHint")}
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Stage: preview                                                     */}
          {/* ---------------------------------------------------------------- */}
          {stage === "preview" && parseResult && (
            <div className="space-y-4">
              {/* File name */}
              {fileName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IconFileImport className="size-3.5 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}

              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/40 px-4 py-3">
                  <p className="text-2xl font-bold">{parseResult.routes.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("approvalRoute.import.colRouteName")}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 px-4 py-3">
                  <p className="text-2xl font-bold">{totalSteps}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("approvalRoute.import.colSteps")}
                  </p>
                </div>
              </div>

              {/* Parse errors */}
              {parseResult.errors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                    <IconAlertCircle className="size-4 shrink-0" />
                    {t("approvalRoute.import.parseError")}
                  </p>
                  <ul className="text-xs text-destructive/80 list-disc list-inside space-y-0.5">
                    {parseResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              {parseResult.routes.length > 0 && (
                <div className="border rounded-md overflow-auto max-h-56">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("approvalRoute.import.colRouteName")}</TableHead>
                        <TableHead className="w-16 text-center">{t("approvalRoute.import.colSteps")}</TableHead>
                        <TableHead>{t("approvalRoute.import.colConditions")}</TableHead>
                        <TableHead className="w-20 text-center">{t("approvalRoute.import.colActive")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.routes.map((route, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{route.name}</TableCell>
                          <TableCell className="text-center tabular-nums">
                            {route.steps.length}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {summarizeConditions(route)}
                          </TableCell>
                          <TableCell className="text-center">
                            {route.is_active !== false ? (
                              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50">
                                {t("approvalRoute.import.yes")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                {t("approvalRoute.import.no")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Stage: importing                                                   */}
          {/* ---------------------------------------------------------------- */}
          {stage === "importing" && parseResult && (
            <div className="py-8 text-center space-y-4">
              <p className="text-sm font-medium">
                {t("approvalRoute.import.importing")
                  .replace("{current}", String(importProgress))
                  .replace("{total}", String(parseResult.routes.length))}
              </p>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(importProgress / parseResult.routes.length) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((importProgress / parseResult.routes.length) * 100)}%
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          {/* Left side */}
          <div>
            {stage === "upload" && (
              <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                <IconDownload className="size-4 mr-2" />
                {t("approvalRoute.import.downloadTemplate")}
              </Button>
            )}
            {stage === "preview" && (
              <Button
                variant="outline"
                onClick={() => {
                  setStage("upload");
                  setParseResult(null);
                  setFileName("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                {t("approvalRoute.import.back")}
              </Button>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {stage === "upload" && (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            )}
            {stage === "preview" && (
              <Button onClick={handleImport} disabled={!canImport}>
                {t("approvalRoute.import.importBtn")} ({parseResult?.routes.length ?? 0})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
