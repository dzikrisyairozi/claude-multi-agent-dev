"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  createApprovalRoute,
  updateApprovalRoute,
} from "@/service/approvalRoute/approvalRoute";
import {
  ApprovalRoute,
  ApprovalRouteApproverRole,
  CreateApprovalRouteStepParams,
} from "@/types/approvalRoute";
import {
  ApprovalRouteConditionsEditor,
  ConditionGroup,
  conditionsToGroups,
  groupsToConditions,
} from "./approval-route-conditions-editor";
import { ApprovalRouteStepsEditor } from "./approval-route-steps-editor";
import { useLanguage } from "@/providers/LanguageProvider";

interface ApprovalRouteDetailFormProps {
  route: ApprovalRoute | null; // null = create mode
  onSuccess: (newRouteId?: string) => void;
  onCancel: () => void;
}

interface FormValues {
  name: string;
  description: string;
  is_active: boolean;
  weight: number;
  conditionGroups: ConditionGroup[];
  steps: CreateApprovalRouteStepParams[];
}

function buildInitialValues(route: ApprovalRoute | null): FormValues {
  return {
    name: route?.name ?? "",
    description: route?.description ?? "",
    is_active: route?.is_active ?? true,
    weight: route?.weight ?? 50,
    conditionGroups: route ? conditionsToGroups(route.conditions ?? {}) : [],
    steps:
      route?.steps.map((s) => ({
        step_order: s.step_order,
        name: s.name,
        approver_role:
          (s.approver_role as ApprovalRouteApproverRole) ?? undefined,
        approver_user_id: s.approver_user_id ?? undefined,
        approver_position_id: s.approver_position_id ?? undefined,
        approver_department_id: s.approver_department_id ?? undefined,
        is_required: s.is_required,
        assignee_user_ids: s.assignees?.length ? s.assignees.map((a) => a.user_id) : undefined,
      })) ?? [],
  };
}

export function ApprovalRouteDetailForm({
  route,
  onSuccess,
  onCancel,
}: ApprovalRouteDetailFormProps) {
  const isCreate = route === null;
  const { t } = useLanguage();

  const schema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().required(t("approvalRoute.form.routeNameRequired")),
        description: Yup.string(),
        is_active: Yup.boolean(),
        weight: Yup.number().min(1).max(100).required(),
      }),
    [t],
  );

  const formik = useFormik<FormValues>({
    initialValues: buildInitialValues(route),
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        // Validate steps
        if (values.steps.length === 0) {
          toast.error("At least one approval step is required");
          setSubmitting(false);
          return;
        }

        for (let i = 0; i < values.steps.length; i++) {
          const step = values.steps[i];
          if (!step.name?.trim()) {
            toast.error(`Step ${i + 1}: Step name is required`);
            setSubmitting(false);
            return;
          }
          const hasAssignment =
            step.approver_role ||
            step.approver_position_id ||
            step.approver_department_id ||
            (step.assignee_user_ids && step.assignee_user_ids.length > 0);
          if (!hasAssignment) {
            toast.error(`Step ${i + 1}: At least one assignment filter or specific member is required`);
            setSubmitting(false);
            return;
          }
        }

        const conditions = groupsToConditions(values.conditionGroups);

        if (isCreate) {
          const { data, error } = await createApprovalRoute({
            name: values.name,
            description: values.description || undefined,
            is_active: values.is_active,
            conditions,
            weight: values.weight,
            steps: values.steps,
          });

          if (error) {
            toast.error(error);
          } else {
            toast.success(t("approvalRoute.form.createSuccess"));
            onSuccess(data?.id);
          }
        } else {
          const { error } = await updateApprovalRoute({
            id: route.id,
            name: values.name,
            description: values.description || undefined,
            is_active: values.is_active,
            conditions,
            weight: values.weight,
            steps: values.steps,
          });

          if (error) {
            toast.error(error);
          } else {
            toast.success(t("approvalRoute.form.updateSuccess"));
            onSuccess();
          }
        }
      } catch {
        toast.error(
          isCreate
            ? t("approvalRoute.form.createFailed")
            : t("approvalRoute.form.updateFailed"),
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    formik.resetForm({ values: buildInitialValues(route) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const handleConditionGroupsChange = useCallback(
    (groups: ConditionGroup[]) => formik.setFieldValue("conditionGroups", groups),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formik.setFieldValue],
  );

  const handleStepsChange = useCallback(
    (steps: CreateApprovalRouteStepParams[]) =>
      formik.setFieldValue("steps", steps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formik.setFieldValue],
  );

  const handleAddStep = useCallback(() => {
    const newSteps = [
      ...formik.values.steps,
      {
        step_order: formik.values.steps.length + 1,
        name: "",
        approver_role: undefined as ApprovalRouteApproverRole | undefined,
        is_required: true,
      },
    ];
    formik.setFieldValue("steps", newSteps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.steps, formik.setFieldValue]);

  return (
    <form onSubmit={formik.handleSubmit} className="flex flex-col">
      {/* Breadcrumb */}
      <div className="pt-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={onCancel}
              >
                {t("approvalRoute.title")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isCreate ? t("approvalRoute.newRoute") : route.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Scrollable content */}
      <div className="flex flex-col gap-6 py-6">
        {/* Route Details */}
        <Card className="rounded-[10px] shadow-none">
          <CardContent className="p-6 flex flex-col gap-6">
            <h2 className="text-xl font-bold mb-2">{t("approvalRoute.form.routeDetails")}</h2>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="font-semibold">
                {t("approvalRoute.form.routeName")}
              </Label>
              <Input
                id="name"
                className="h-[50px] rounded-[10px]"
                placeholder={t("approvalRoute.form.routeNamePlaceholder")}
                {...formik.getFieldProps("name")}
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-sm text-destructive">{formik.errors.name}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="font-semibold">
                {t("approvalRoute.form.description")}
              </Label>
              <Textarea
                id="description"
                className="rounded-[10px]"
                placeholder={t("approvalRoute.form.descriptionPlaceholder")}
                rows={3}
                {...formik.getFieldProps("description")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold">{t("approvalRoute.form.status")}</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formik.values.is_active}
                  onCheckedChange={(val) =>
                    formik.setFieldValue("is_active", val)
                  }
                />
                <Label
                  htmlFor="is_active"
                  className="font-normal cursor-pointer text-xs"
                >
                  {formik.values.is_active
                    ? t("approvalRoute.form.active")
                    : t("approvalRoute.form.inactive")}
                </Label>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weight" className="font-semibold">
                Route Weight
              </Label>
              <Input
                id="weight"
                type="number"
                min={1}
                max={100}
                className="h-[50px] rounded-[10px] w-32"
                {...formik.getFieldProps("weight")}
                onChange={(e) =>
                  formik.setFieldValue("weight", Number(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                When multiple routes match, the one with higher weight is used (1-100)
              </p>
              {formik.touched.weight && formik.errors.weight && (
                <p className="text-sm text-destructive">{formik.errors.weight}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card className="rounded-[10px] shadow-none">
          <CardContent className="p-6">
            <ApprovalRouteConditionsEditor
              groups={formik.values.conditionGroups}
              onChange={handleConditionGroupsChange}
            />
          </CardContent>
        </Card>

        {/* Approval Steps */}
        <Card className="rounded-[10px] shadow-none">
          <CardContent className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold">{t("approvalRoute.steps.title")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("approvalRoute.steps.subtitle")}
                </p>
              </div>
              <Button
                type="button"
                className="h-[45px] px-5 rounded-[8px]"
                onClick={handleAddStep}
              >
                <IconPlus className="size-4 mr-1.5" />
                {t("approvalRoute.steps.addStep")}
              </Button>
            </div>

            <ApprovalRouteStepsEditor
              steps={formik.values.steps}
              onChange={handleStepsChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sticky footer */}
      <div className="flex gap-4 py-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-[42px] rounded-[8px]"
          onClick={onCancel}
          disabled={formik.isSubmitting}
        >
          {t("action.cancel")}
        </Button>
        <Button
          type="submit"
          className="flex-1 h-[42px] rounded-[8px]"
          disabled={formik.isSubmitting}
        >
          {formik.isSubmitting && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          {isCreate
            ? t("approvalRoute.form.createRoute")
            : t("approvalRoute.form.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
