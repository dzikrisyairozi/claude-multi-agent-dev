"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContentScrollable,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApprovalRouteApproverRole,
  CreateApprovalRouteStepParams,
} from "@/types/approvalRoute";
import { Position } from "@/types/position";
import { Department } from "@/types/department";
import {
  IconGripVertical,
  IconTrash,
  IconListNumbers,
  IconX,
  IconSearch,
  IconPlus,
  IconUsers,
  IconFilter,
} from "@tabler/icons-react";
import { useLanguage, TranslationKey } from "@/providers/LanguageProvider";
import { useMemo, useEffect, useState, useCallback } from "react";
import { getActivePositions } from "@/service/admin/position";
import { getActiveDepartments } from "@/service/admin/department";
import { getActiveProfiles, PickerProfile } from "@/service/admin/user";

type StepMode = "filter" | "member";
type FilterType = "role" | "position" | "department";

export function getStepMode(step: CreateApprovalRouteStepParams): StepMode {
  if (step.assignee_user_ids !== undefined) return "member";
  return "filter";
}

export function getActiveFilters(step: CreateApprovalRouteStepParams): FilterType[] {
  const filters: FilterType[] = [];
  if (step.approver_role !== undefined) filters.push("role");
  if (step.approver_position_id !== undefined) filters.push("position");
  if (step.approver_department_id !== undefined) filters.push("department");
  return filters;
}

export function getAvailableFilters(step: CreateApprovalRouteStepParams): FilterType[] {
  const active = getActiveFilters(step);
  const all: FilterType[] = ["role", "position", "department"];
  return all.filter((f) => !active.includes(f));
}

interface ApprovalRouteStepsEditorProps {
  steps: CreateApprovalRouteStepParams[];
  onChange: (steps: CreateApprovalRouteStepParams[]) => void;
  error?: string;
}

const FILTER_LABEL_KEYS: Record<FilterType, TranslationKey> = {
  role: "approvalRoute.steps.approverRole",
  position: "approvalRoute.steps.position",
  department: "approvalRoute.steps.department",
};

export function ApprovalRouteStepsEditor({
  steps,
  onChange,
  error,
}: ApprovalRouteStepsEditorProps) {
  const { t } = useLanguage();
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<PickerProfile[]>([]);
  const [memberSearches, setMemberSearches] = useState<Record<number, string>>({});

  useEffect(() => {
    getActivePositions().then((res) => {
      if (res.data) setPositions(res.data);
    });
    getActiveDepartments().then((res) => {
      if (res.data) setDepartments(res.data);
    });
    getActiveProfiles().then((res) => {
      if (res.data) setProfiles(res.data);
    });
  }, []);

  const APPROVER_ROLE_OPTIONS = useMemo<
    { value: ApprovalRouteApproverRole; label: string }[]
  >(
    () => [
      { value: "approver", label: t("approvalRoute.steps.approver") },
      { value: "accounting", label: t("approvalRoute.steps.accounting") },
      { value: "admin", label: t("approvalRoute.steps.admin") },
    ],
    [t],
  );

  const removeStep = (index: number) => {
    const updated = steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, step_order: i + 1 }));
    onChange(updated);
  };

  const updateStep = (index: number, updates: Partial<CreateApprovalRouteStepParams>) => {
    const updated = steps.map((s, i) =>
      i === index ? { ...s, ...updates } : s
    );
    onChange(updated);
  };

  // Add a filter to a step (clears members, sets empty value for the filter)
  const addFilter = (index: number, filterType: FilterType) => {
    const updates: Partial<CreateApprovalRouteStepParams> = {
      assignee_user_ids: undefined,
    };
    // Set empty string so the filter row renders (actual value selected via dropdown)
    if (filterType === "role") updates.approver_role = "" as ApprovalRouteApproverRole;
    if (filterType === "position") updates.approver_position_id = "";
    if (filterType === "department") updates.approver_department_id = "";
    updateStep(index, updates);
  };

  // Remove a filter from a step
  const removeFilter = (index: number, filterType: FilterType) => {
    const updates: Partial<CreateApprovalRouteStepParams> = {};
    if (filterType === "role") updates.approver_role = undefined;
    if (filterType === "position") updates.approver_position_id = undefined;
    if (filterType === "department") updates.approver_department_id = undefined;
    updateStep(index, updates);
  };

  // Switch to member mode (clears all filters)
  const switchToMembers = (index: number) => {
    updateStep(index, {
      approver_role: undefined,
      approver_position_id: undefined,
      approver_department_id: undefined,
      assignee_user_ids: [],
    });
  };

  // Switch to filter mode (clears members)
  const switchToFilters = (index: number) => {
    updateStep(index, {
      assignee_user_ids: undefined,
    });
  };

  const toggleUserAssignee = useCallback((stepIndex: number, userId: string) => {
    const step = steps[stepIndex];
    const current = step.assignee_user_ids || [];
    const isSelected = current.includes(userId);
    if (!isSelected && current.length >= 10) return;
    const updated = isSelected
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    const newSteps = steps.map((s, i) =>
      i === stepIndex ? { ...s, assignee_user_ids: updated } : s
    );
    onChange(newSteps);
  }, [steps, onChange]);

  const selectAllUsers = (stepIndex: number, filteredProfiles: PickerProfile[]) => {
    const current = steps[stepIndex].assignee_user_ids || [];
    const toAdd = filteredProfiles.filter((p) => !current.includes(p.id)).map((p) => p.id);
    const newIds = [...current, ...toAdd].slice(0, 10);
    const newSteps = steps.map((s, i) =>
      i === stepIndex ? { ...s, assignee_user_ids: newIds } : s
    );
    onChange(newSteps);
  };

  const deselectAllUsers = (stepIndex: number) => {
    const newSteps = steps.map((s, i) =>
      i === stepIndex ? { ...s, assignee_user_ids: [] } : s
    );
    onChange(newSteps);
  };

  const removeAssignee = (stepIndex: number, userId: string) => {
    const current = steps[stepIndex].assignee_user_ids || [];
    const newSteps = steps.map((s, i) =>
      i === stepIndex ? { ...s, assignee_user_ids: current.filter((id) => id !== userId) } : s
    );
    onChange(newSteps);
  };

  const getFilteredProfiles = (stepIndex: number) => {
    const search = (memberSearches[stepIndex] || "").toLowerCase();
    if (!search) return profiles;
    return profiles.filter(
      (p) =>
        p.first_name?.toLowerCase().includes(search) ||
        p.last_name?.toLowerCase().includes(search) ||
        p.email?.toLowerCase().includes(search) ||
        (p.department as { name?: string } | null)?.name?.toLowerCase().includes(search)
    );
  };

  const getProfileName = (profile: PickerProfile) => {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    return name || profile.email || "Unknown";
  };

  const getProfileInitials = (profile: PickerProfile) => {
    const first = profile.first_name?.[0] || "";
    const last = profile.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <div className="flex flex-col gap-4">
      {steps.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded-lg text-muted-foreground">
          <IconListNumbers className="size-8 opacity-40" />
          <p className="text-sm">{t("approvalRoute.steps.empty")}</p>
        </div>
      )}

      {steps.map((step, index) => {
        const mode = getStepMode(step);
        const activeFilters = getActiveFilters(step);
        const availableFilters = getAvailableFilters(step);
        const filteredProfiles = getFilteredProfiles(index);
        const selectedIds = step.assignee_user_ids || [];

        return (
          <div
            key={index}
            className="border rounded-lg p-5 flex flex-col gap-4 transition-all duration-200 hover:border-sky-200"
          >
            {/* Step header */}
            <div className="flex items-center gap-2">
              <IconGripVertical className="size-4 text-muted-foreground shrink-0 cursor-grab" />
              <span className="text-lg font-bold flex-1">
                {t("approvalRoute.steps.step", { n: index + 1 })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStep(index)}
                className="h-8 w-8 text-destructive hover:bg-red-50"
              >
                <IconTrash className="size-4" />
              </Button>
            </div>

            {/* Step Name */}
            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold">{t("approvalRoute.steps.stepName")}</Label>
              <Input
                className="h-[50px] rounded-lg"
                placeholder={t("approvalRoute.steps.stepNamePlaceholder")}
                value={step.name}
                onChange={(e) => updateStep(index, { name: e.target.value })}
              />
            </div>

            {/* Assignment section */}
            <div className="flex flex-col gap-3">
              {/* Filter mode */}
              {mode === "filter" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <IconFilter className="size-4" />
                      {t("approvalRoute.steps.assignmentFilters")}
                    </div>
                    <div className="flex items-center gap-2">
                      {availableFilters.length > 0 && (
                        <Select
                          value=""
                          onValueChange={(val) => addFilter(index, val as FilterType)}
                        >
                          <SelectTrigger className="h-8 w-auto gap-1.5 text-xs text-sky-500 border-sky-200 hover:bg-sky-50 rounded-md px-2.5">
                            <IconPlus className="size-3" />
                            <span>{t("approvalRoute.steps.addFilter")}</span>
                          </SelectTrigger>
                          <SelectContentScrollable>
                            {availableFilters.map((f) => (
                              <SelectItem key={f} value={f}>{t(FILTER_LABEL_KEYS[f])}</SelectItem>
                            ))}
                          </SelectContentScrollable>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Active filter rows */}
                  {activeFilters.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      {t("approvalRoute.steps.noFilters")}
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    {activeFilters.includes("role") && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-24 shrink-0">{t("approvalRoute.steps.approverRole")}</span>
                        <Select
                          value={step.approver_role ?? ""}
                          onValueChange={(val) =>
                            updateStep(index, { approver_role: val as ApprovalRouteApproverRole })
                          }
                        >
                          <SelectTrigger className="h-[42px] rounded-lg w-[250px]">
                            <SelectValue placeholder={t("approvalRoute.steps.selectRole")} />
                          </SelectTrigger>
                          <SelectContentScrollable>
                            {APPROVER_ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContentScrollable>
                        </Select>
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFilter(index, "role")}
                        >
                          <IconX className="size-3.5" />
                        </Button>
                      </div>
                    )}

                    {activeFilters.includes("position") && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-24 shrink-0">{t("approvalRoute.steps.position")}</span>
                        <Select
                          value={step.approver_position_id ?? ""}
                          onValueChange={(val) =>
                            updateStep(index, { approver_position_id: val || undefined })
                          }
                        >
                          <SelectTrigger className="h-[42px] rounded-lg w-[250px]">
                            <SelectValue placeholder={t("approvalRoute.steps.selectPosition")} />
                          </SelectTrigger>
                          <SelectContentScrollable>
                            {positions.map((pos) => (
                              <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                            ))}
                          </SelectContentScrollable>
                        </Select>
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFilter(index, "position")}
                        >
                          <IconX className="size-3.5" />
                        </Button>
                      </div>
                    )}

                    {activeFilters.includes("department") && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-24 shrink-0">{t("approvalRoute.steps.department")}</span>
                        <Select
                          value={step.approver_department_id ?? ""}
                          onValueChange={(val) =>
                            updateStep(index, { approver_department_id: val || undefined })
                          }
                        >
                          <SelectTrigger className="h-[42px] rounded-lg w-[250px]">
                            <SelectValue placeholder={t("approvalRoute.steps.selectDepartment")} />
                          </SelectTrigger>
                          <SelectContentScrollable>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                          </SelectContentScrollable>
                        </Select>
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFilter(index, "department")}
                        >
                          <IconX className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Switch to members */}
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-600 self-start mt-1"
                    onClick={() => switchToMembers(index)}
                  >
                    <IconUsers className="size-3.5" />
                    {t("approvalRoute.steps.orAssignMembers")}
                  </button>
                </div>
              )}

              {/* Member mode */}
              {mode === "member" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <IconUsers className="size-4" />
                      {t("approvalRoute.steps.specificMembers")}
                      <span className="text-xs">({selectedIds.length}/10)</span>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-600"
                      onClick={() => switchToFilters(index)}
                    >
                      <IconFilter className="size-3.5" />
                      {t("approvalRoute.steps.switchToFilters")}
                    </button>
                  </div>

                  {/* Selected user chips */}
                  {selectedIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedIds.map((uid) => {
                        const profile = profiles.find((p) => p.id === uid);
                        if (!profile) return null;
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-sm"
                          >
                            {getProfileName(profile)}
                            <button
                              type="button"
                              onClick={() => removeAssignee(index, uid)}
                              className="hover:text-destructive"
                            >
                              <IconX className="size-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Search + dropdown */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b">
                      <IconSearch className="size-5 text-muted-foreground" />
                      <input
                        type="text"
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        placeholder={t("approvalRoute.steps.searchMember")}
                        value={memberSearches[index] || ""}
                        onChange={(e) =>
                          setMemberSearches((prev) => ({ ...prev, [index]: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-4 px-4 py-2 bg-muted/50 text-sm font-semibold text-sky-500">
                      <button type="button" onClick={() => selectAllUsers(index, filteredProfiles)}>
                        {t("approvalRoute.steps.selectAll")}
                      </button>
                      <button type="button" onClick={() => deselectAllUsers(index)}>
                        {t("approvalRoute.steps.deselectAll")}
                      </button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredProfiles.map((profile) => {
                        const isChecked = selectedIds.includes(profile.id);
                        const isDisabled = !isChecked && selectedIds.length >= 10;
                        const dept = profile.department as { name?: string } | null;
                        return (
                          <label
                            key={profile.id}
                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer ${isDisabled ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-center justify-center size-8 rounded-full bg-muted text-xs font-medium shrink-0">
                              {getProfileInitials(profile)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">{getProfileName(profile)}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {dept?.name || profile.role}
                              </div>
                            </div>
                            <Checkbox
                              checked={isChecked}
                              disabled={isDisabled}
                              onCheckedChange={() => toggleUserAssignee(index, profile.id)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
