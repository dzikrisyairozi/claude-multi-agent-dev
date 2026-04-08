import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormik, FieldArray, FormikProvider } from "formik";
import * as Yup from "yup";
import {
  CreateApprovalRequestParams,
  ApprovalRequest,
  ApprovalRequestItem,
} from "@/types/approvalRequest";
import {
  createApprovalRequest,
  updateApprovalRequest,
} from "@/service/approvalRequest/approvalRequest";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Trash2,
  FileText,
  Paperclip,
  X,
  Wallet,
  ShoppingCart,
  FileEdit,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ApprovalRouteTimeline } from "@/components/approval-request/ApprovalRouteTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";
import { CategoryType } from "@/types/categoryType";
import { getActiveCategoryTypes } from "@/service/admin/categoryType";
import { Department } from "@/types/department";
import { getActiveDepartments } from "@/service/admin/department";
import { matchApprovalRoute } from "@/service/approvalRequest/approvalRouteMatching";
import { ApprovalRouteStep } from "@/types/approvalRoute";

interface SubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ApprovalRequest | null;
  prefillData?: Record<string, unknown> | null; // AI-proposed data — pre-fills form but creates NEW (not edit mode)
  onSuccess: () => void;
}

function calculateSubtotal(items: ApprovalRequestItem[]) {
  return items.reduce((acc, item) => acc + item.quantity * item.amount, 0);
}

function calculateTax(subtotal: number, rate: number, isUseTax: boolean) {
  if (!isUseTax) return 0;
  return subtotal * (rate / 100);
}

function calculateTotal(
  items: ApprovalRequestItem[],
  rate: number,
  isUseTax: boolean,
  isTaxIncluded: boolean,
) {
  const subtotal = calculateSubtotal(items);
  if (!isUseTax) return subtotal;
  const tax = calculateTax(subtotal, rate, isUseTax);
  return isTaxIncluded ? subtotal : subtotal + tax;
}

interface Attachment {
  id?: string; // document id
  url?: string;
  name: string;
  type: "document" | "url";
}

export function SubmissionDialog({
  open,
  onOpenChange,
  initialData,
  prefillData,
  onSuccess,
}: SubmissionDialogProps) {
  const { t } = useLanguage();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [matchedRouteSteps, setMatchedRouteSteps] = useState<ApprovalRouteStep[]>([]);
  const [routeChecked, setRouteChecked] = useState(false);

  const noRouteMatch = routeChecked && matchedRouteSteps.length === 0;
  const shouldBlockSubmit = noRouteMatch && !initialData?.step_approvals?.length;

  const isDraft = !initialData || initialData.status === "draft";

  // Fetch category types and departments when dialog opens
  useEffect(() => {
    if (open) {
      getActiveCategoryTypes().then((res) => {
        if (res.data) setCategoryTypes(res.data);
      });
      getActiveDepartments().then((res) => {
        if (res.data) setDepartments(res.data);
      });
    }
  }, [open]);

  const draftValidationSchema = useMemo(() => Yup.object().shape({
    title: Yup.string().required(t("submission.titleRequired")),
  }), [t]);

  const validationSchema = useMemo(() => Yup.object().shape({
    title: Yup.string().required(t("submission.titleRequired")),
    vendor_name: Yup.string().required(t("form.vendorNameRequired")),
    category: Yup.string().required(t("validation.categoryRequired")),
    amount: Yup.number()
      .required(t("validation.amountRequired"))
      .min(0, t("validation.amountPositive")),
    priority: Yup.string().required(t("validation.priorityRequired")),
    date: Yup.string().required(t("form.requiredByDateRequired")),
    description: Yup.string(),
    department: Yup.string().required(t("form.departmentRequired")),
    is_use_tax: Yup.boolean(),
    is_tax_included: Yup.boolean(),
    tax_rate: Yup.number().min(0).max(100),
    payment_schedule_date: Yup.string().required(
      t("form.paymentScheduleDateRequired"),
    ),
    payment_method: Yup.string().required(t("form.paymentMethodRequired")),
    reason_for_purchase: Yup.string().required(
      t("form.reasonForPurchaseRequired"),
    ),
    purpose: Yup.string().required(t("form.purposeRequired")),
    remarks: Yup.string(),
    items: Yup.array()
      .of(
        Yup.object().shape({
          name: Yup.string().required(t("form.itemNameRequired")),
          quantity: Yup.number()
            .min(1, t("form.quantityMin"))
            .required(t("validation.required")),
          amount: Yup.number()
            .min(0, t("form.pricePositive"))
            .required(t("validation.required")),
        }),
      )
      .when("category", {
        is: (val: string) => val === "purchasing" || val === "expenses",
        then: (schema) => schema.min(1, t("form.itemsMinOne")),
      }),
  }), [t]);

  useEffect(() => {
    if (initialData?.documents) {
      const existingAttachments: Attachment[] = initialData.documents.map(
        (doc) => {
          if (doc.document_id) {
            return {
              id: doc.document_id,
              name: doc.documents?.file_name || "Attached Document",
              type: "document",
            };
          } else {
            return {
              url: doc.document_url || "",
              name: doc.document_url || "External Link",
              type: "url",
            };
          }
        },
      );
      setAttachments(existingAttachments);
    } else if (prefillData?.document_ids && Array.isArray(prefillData.document_ids) && prefillData.document_ids.length) {
      // AI proposal — link referenced documents, fetch names from DB
      const docIds = prefillData.document_ids as string[];
      supabase
        .from("documents")
        .select("id, file_name")
        .in("id", docIds)
        .then(({ data: docs }) => {
          const nameMap = new Map((docs ?? []).map((d: { id: string; file_name: string }) => [d.id, d.file_name]));
          setAttachments(
            docIds.map((id: string) => ({
              id,
              name: nameMap.get(id) || "Linked Document",
              type: "document" as const,
            })),
          );
        });
      // Set immediately with IDs (names will update when query resolves)
      setAttachments(
        docIds.map((id: string) => ({
          id,
          name: "Loading...",
          type: "document" as const,
        })),
      );
    } else {
      setAttachments([]);
    }
  }, [initialData, prefillData]);

  const createMutation = useMutation({
    mutationFn: async (values: CreateApprovalRequestParams) => {
      const { data, error } = await createApprovalRequest(values);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      toast.success(t("submission.toast.createSuccess"));
      formik.resetForm();
      setAttachments([]);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("submission.toast.createError"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (
      values: { id: string } & CreateApprovalRequestParams,
    ) => {
      const { data, error } = await updateApprovalRequest(values);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      toast.success(t("submission.toast.updateSuccess"));
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("submission.toast.updateError"));
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (values: CreateApprovalRequestParams & { id?: string }) => {
      const { id, ...rest } = values as CreateApprovalRequestParams & { id?: string };
      if (id) {
        const { data, error } = await updateApprovalRequest({ id, ...rest, status: "draft" });
        if (error) throw new Error(error);
        return data;
      } else {
        const { data, error } = await createApprovalRequest({ ...rest, status: "draft" });
        if (error) throw new Error(error);
        return data;
      }
    },
    onSuccess: () => {
      toast.success(t("submission.toast.draftSaveSuccess"));
      formik.resetForm();
      setAttachments([]);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("submission.toast.draftSaveError"));
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending || saveDraftMutation.isPending;

  // Use initialData (edit mode) or prefillData (AI proposal) as source for form values
  const source: Partial<ApprovalRequest> | null =
    initialData || (prefillData as Partial<ApprovalRequest>) || null;

  const formik = useFormik({
    initialValues: {
      title: source?.title || "",
      vendor_name: source?.vendor_name || "",
      category: source?.category || "purchasing",
      amount: source?.amount || 0,
      priority: source?.priority || "medium",
      date: source?.date || "",
      description: source?.description || "",
      items: source?.items || ([] as ApprovalRequestItem[]),
      department: source?.department || "",
      is_use_tax: source?.is_use_tax ?? false,
      is_tax_included: source?.is_tax_included ?? true,
      tax_rate: source?.tax_rate || 10,
      payment_schedule_date: source?.payment_schedule_date || "",
      payment_method: source?.payment_method || "",
      reason_for_purchase: source?.reason_for_purchase || "",
      purpose: source?.purpose || "",
      remarks: source?.remarks || "",
      category_type_id: source?.category_type_id || "",
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: (values) => {
      const document_ids = attachments
        .filter((a) => a.type === "document" && a.id)
        .map((a) => a.id as string);
      const document_urls = attachments
        .filter((a) => a.type === "url" && a.url)
        .map((a) => a.url as string);

      const totalAmount = calculateTotal(
        values.items,
        values.tax_rate,
        values.is_use_tax,
        values.is_tax_included,
      );

      const submissionData = {
        ...values,
        amount: totalAmount,
        document_ids,
        document_urls,
        category_type_id: values.category_type_id || undefined,
        status: "pending" as const,
      };

      if (initialData) {
        updateMutation.mutate({
          id: initialData.id,
          ...submissionData,
        });
      } else {
        createMutation.mutate(submissionData);
      }
    },
  });

  const errorsRef = useRef(formik.errors);
  errorsRef.current = formik.errors;

  // Normalize department against active department list.
  // Legacy drafts / AI prefill may carry a department string that no longer
  // matches an active department; clear it so the user must reselect a
  // canonical value (otherwise approval-route matching cannot resolve).
  useEffect(() => {
    if (departments.length === 0) return;
    const current = formik.values.department;
    if (!current) return;
    const isValid = departments.some((d) => d.name === current);
    if (!isValid) {
      formik.setFieldValue("department", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, formik.values.department]);

  useEffect(() => {
    if (formik.submitCount === 0) return;
    if (Object.keys(errorsRef.current).length === 0) return;

    const fieldOrder = [
      { field: "title", elementId: "title" },
      { field: "priority", elementId: "field-priority" },
      { field: "department", elementId: "department" },
      { field: "items", elementId: "field-items" },
      { field: "vendor_name", elementId: "vendor_name" },
      { field: "payment_schedule_date", elementId: "payment_schedule_date" },
      { field: "payment_method", elementId: "field-payment_method" },
      { field: "date", elementId: "field-date" },
      { field: "reason_for_purchase", elementId: "reason_for_purchase" },
      { field: "purpose", elementId: "purpose" },
    ];

    const firstError = fieldOrder.find(
      ({ field }) => (errorsRef.current as Record<string, unknown>)[field],
    );
    if (firstError) {
      const el = document.getElementById(firstError.elementId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    toast.error(t("submission.validationError"));
  }, [formik.submitCount]);

  // Dynamically match approval route when relevant fields change
  const routeCategory = formik.values.category;
  const routeDepartment = formik.values.department;
  const routeAmount = calculateTotal(
    formik.values.items,
    formik.values.tax_rate,
    formik.values.is_use_tax,
    formik.values.is_tax_included,
  );
  const routeCategoryTypeId = formik.values.category_type_id;

  useEffect(() => {
    if (!open) return;
    setRouteChecked(false);
    // Debounce the route matching to avoid excessive calls while typing amount
    const timer = setTimeout(() => {
      matchApprovalRoute(
        routeCategory ?? null,
        routeDepartment ?? null,
        routeAmount ?? null,
        routeCategoryTypeId ?? null,
      ).then((res) => {
        setMatchedRouteSteps(res.data?.steps ?? []);
        setRouteChecked(true);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [open, routeCategory, routeDepartment, routeAmount, routeCategoryTypeId]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error(t("submission.toast.loginRequired"));
        return;
      }

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      const newAttachments: Attachment[] = (result.results || [])
        .filter((r: { status: string; document?: { id: string; file_name: string } }) => r.status === "success" && r.document)
        .map((r: { status: string; document: { id: string; file_name: string } }) => ({
          id: r.document.id,
          name: r.document.file_name,
          type: "document",
        }));

      setAttachments((prev) => [...prev, ...newAttachments]);
      toast.success(t("submission.toast.uploadSuccess"));
    } catch (error: unknown) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : t("submission.toast.uploadError"));
    } finally {
      setIsUploading(false);
    }
  }, [t]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? t("submission.title.edit")
              : t("submission.title.new")}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? t("submission.description.edit")
              : t("submission.description.new")}
          </DialogDescription>
        </DialogHeader>

        {/* Revision comment banner for need_revision submissions */}
        {initialData?.status === "need_revision" && initialData.approval_notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <p className="text-xs font-semibold text-amber-700 mb-1">
              {t("approval.needRevision.revisionComment")}
            </p>
            <p className="text-sm text-slate-700">{initialData.approval_notes}</p>
          </div>
        )}

        <form onSubmit={formik.handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-gray-900 font-semibold">
                {t("submission.category.label")}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: "purchasing",
                    label: t("submission.category.purchasing"),
                    sub: t("submission.category.purchasing.sub"),
                    icon: ShoppingCart,
                    color: "text-gray-500",
                    bg: "bg-gray-50",
                  },
                  {
                    id: "contracts",
                    label: t("submission.category.contract"),
                    sub: t("submission.category.contract.sub"),
                    icon: FileEdit,
                    color: "text-gray-500",
                    bg: "bg-gray-50",
                  },
                  {
                    id: "expenses",
                    label: t("submission.category.expense"),
                    sub: t("submission.category.expense.sub"),
                    icon: Wallet,
                    color: "text-gray-500",
                    bg: "bg-gray-50",
                  },
                  {
                    id: "other",
                    label: t("submission.category.other"),
                    sub: t("submission.category.other.sub"),
                    icon: HelpCircle,
                    color: "text-gray-500",
                    bg: "bg-gray-50",
                  },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      formik.setFieldValue("category", cat.id);
                      formik.setFieldValue("category_type_id", "");
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-center gap-2",
                      formik.values.category === cat.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-gray-100 bg-white hover:border-gray-200",
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        formik.values.category === cat.id
                          ? "bg-primary/10"
                          : cat.bg,
                      )}
                    >
                      <cat.icon
                        className={cn(
                          "w-5 h-5",
                          formik.values.category === cat.id
                            ? "text-primary"
                            : cat.color,
                        )}
                      />
                    </div>
                    <div>
                      <div
                        className={cn(
                          "text-sm font-bold",
                          formik.values.category === cat.id
                            ? "text-primary"
                            : "text-gray-900",
                        )}
                      >
                        {cat.label}
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">
                        {cat.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-category dropdown — filtered by selected parent category */}
            {(() => {
              const filtered = categoryTypes.filter(
                (ct) => ct.category === formik.values.category
              );
              if (filtered.length === 0) return null;
              return (
                <div className="grid gap-2">
                  <Label className="text-gray-700 font-medium">
                    {t("submission.field.subCategory")}
                  </Label>
                  <div className="relative">
                    <Select
                      value={formik.values.category_type_id || ""}
                      onValueChange={(val) =>
                        formik.setFieldValue("category_type_id", val)
                      }
                    >
                      <SelectTrigger className={formik.values.category_type_id ? "pr-8" : ""}>
                        <SelectValue placeholder={t("submission.field.subCategory.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {filtered.map((ct) => (
                          <SelectItem key={ct.id} value={ct.id}>
                            {ct.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formik.values.category_type_id && (
                      <button
                        type="button"
                        onClick={() => formik.setFieldValue("category_type_id", "")}
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-700 font-medium">
                {t("submission.field.title")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder={t("submission.field.title.placeholder")}
                {...formik.getFieldProps("title")}
                className={cn(
                  "h-11",
                  formik.touched.title &&
                    formik.errors.title &&
                    "border-red-500",
                )}
              />
              {formik.touched.title && formik.errors.title && (
                <div className="text-red-500 text-sm">
                  {formik.errors.title}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div id="field-priority" className="grid gap-2">
                <Label htmlFor="priority" className="text-gray-700 font-medium">
                  {t("submission.field.priority")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formik.values.priority}
                  onValueChange={(val) => {
                    formik.setFieldValue("priority", val);
                    formik.setFieldTouched("priority", true, false);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "h-11",
                      formik.touched.priority &&
                        formik.errors.priority &&
                        "border-red-500",
                    )}
                  >
                    <SelectValue
                      placeholder={t("submission.field.priority.placeholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("priority.low")}</SelectItem>
                    <SelectItem value="medium">
                      {t("priority.medium")}
                    </SelectItem>
                    <SelectItem value="high">{t("priority.high")}</SelectItem>
                    <SelectItem value="critical">
                      {t("priority.critical")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formik.touched.priority && formik.errors.priority && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.priority}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="department"
                  className="text-gray-700 font-medium"
                >
                  {t("submission.field.department")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formik.values.department}
                  onValueChange={(val) => {
                    formik.setFieldValue("department", val);
                    formik.setFieldTouched("department", true, false);
                  }}
                >
                  <SelectTrigger
                    id="department"
                    className={cn(
                      "h-11 w-full",
                      formik.touched.department &&
                        formik.errors.department &&
                        "border-red-500",
                    )}
                  >
                    <SelectValue
                      placeholder={t("submission.field.department.placeholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formik.touched.department && formik.errors.department && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.department}
                  </div>
                )}
              </div>
            </div>

            <div id="field-items" className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold text-gray-900">
                    {t("submission.items.label")}
                  </Label>
                  <div className="text-xs text-gray-500">
                    {t("submission.items.sublabel")}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full px-4"
                  onClick={() => {
                    const newItems = [
                      ...formik.values.items,
                      { name: "", quantity: 1, amount: 0 },
                    ];
                    formik.setFieldValue("items", newItems);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("submission.items.add")}
                </Button>
              </div>

              {typeof formik.errors.items === "string" && formik.touched.items && (
                <p className="text-sm text-red-500">{formik.errors.items}</p>
              )}

              <FormikProvider value={formik}>
                <FieldArray
                  name="items"
                  render={(arrayHelpers) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-gray-400 px-2">
                        <div className="col-span-6 uppercase">
                          {t("submission.items.header.name")}
                        </div>
                        <div className="col-span-2 uppercase">
                          {t("submission.items.header.qty")}
                        </div>
                        <div className="col-span-3 uppercase">
                          {t("submission.items.header.price")}
                        </div>
                        <div className="col-span-1"></div>
                      </div>
                      {formik.values.items.map((item, index) => {
                        const itemErrors = Array.isArray(formik.errors.items)
                          ? (formik.errors.items[index] as Record<string, string> | undefined)
                          : undefined;
                        const itemTouched = Array.isArray(formik.touched.items)
                          ? formik.touched.items[index]
                          : undefined;
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex gap-2 items-start">
                              <div className="flex-6">
                                <Input
                                  placeholder={t("form.itemNamePlaceholder")}
                                  name={`items.${index}.name`}
                                  value={item.name}
                                  onChange={formik.handleChange}
                                  onBlur={formik.handleBlur}
                                  className={cn("h-11", itemTouched?.name && itemErrors?.name && "border-red-500")}
                                />
                              </div>
                              <div className="flex-2">
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="1"
                                  name={`items.${index}.quantity`}
                                  value={item.quantity}
                                  onChange={formik.handleChange}
                                  onBlur={(e) => {
                                    const val = Math.max(1, Number(e.target.value) || 1);
                                    formik.setFieldValue(`items.${index}.quantity`, val);
                                    formik.handleBlur(e);
                                  }}
                                  className={cn("h-11", itemTouched?.quantity && itemErrors?.quantity && "border-red-500")}
                                />
                              </div>
                              <div className="flex-3">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                    ¥
                                  </span>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    name={`items.${index}.amount`}
                                    value={item.amount}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    className={cn("h-11 pl-7", itemTouched?.amount && itemErrors?.amount && "border-red-500")}
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-red-500 h-11"
                                onClick={() => arrayHelpers.remove(index)}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                            {itemTouched && itemErrors && (
                              <div className="text-xs text-red-500 pl-1">
                                {itemErrors.name || itemErrors.quantity || itemErrors.amount}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                />
              </FormikProvider>

              {formik.values.category === "purchasing" && (
                <>
                  <div className="bg-[#F1F5F9]/80 rounded-xl p-6 flex items-center justify-between border-0">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Switch
                          checked={formik.values.is_use_tax}
                          onCheckedChange={(checked) =>
                            formik.setFieldValue("is_use_tax", checked)
                          }
                          className="data-[state=checked]:bg-[#0EA5E9]"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700 uppercase tracking-tight">
                          {t("submission.tax.enable")}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {t("submission.tax.enable.sub")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {formik.values.is_use_tax && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="grid gap-3">
                        <Label className="text-[12px] uppercase font-bold text-slate-300 tracking-wider">
                          {t("submission.tax.label")}
                        </Label>
                        <ToggleGroup
                          type="single"
                          value={
                            formik.values.is_tax_included
                              ? "included"
                              : "excluded"
                          }
                          onValueChange={(val) => {
                            if (val)
                              formik.setFieldValue(
                                "is_tax_included",
                                val === "included",
                              );
                          }}
                          className="justify-start bg-[#F1F5F9] py-1 px-2 rounded-xl w-full"
                        >
                          <ToggleGroupItem
                            value="included"
                            className={cn(
                              "flex-1 rounded-lg text-sm font-bold transition-all",
                              formik.values.is_tax_included
                                ? "bg-white! text-[#0EA5E9]! shadow-sm ring-1 ring-slate-200"
                                : "text-slate-400 hover:text-slate-600 bg-transparent border-0",
                            )}
                          >
                            {t("submission.tax.included")}
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="excluded"
                            className={cn(
                              "flex-1 rounded-lg text-sm font-bold transition-all",
                              !formik.values.is_tax_included
                                ? "bg-white! text-[#0EA5E9]! shadow-sm ring-1 ring-slate-200"
                                : "text-slate-400 hover:text-slate-600 bg-transparent border-0",
                            )}
                          >
                            {t("submission.tax.excluded")}
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                      <div className="grid gap-3">
                        <Label className="text-[12px] uppercase font-bold text-slate-300 tracking-wider">
                          {t("submission.tax.rate")}
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={formik.values.tax_rate}
                            onChange={(e) =>
                              formik.setFieldValue(
                                "tax_rate",
                                parseFloat(e.target.value),
                              )
                            }
                            className="h-11 pr-10 rounded-xl border-slate-200 bg-white text-base font-medium"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {formik.values.items.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-dashed">
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{t("submission.total.subtotal")}</span>
                    <span className="font-medium font-mono text-gray-900">
                      ¥{" "}
                      {calculateSubtotal(formik.values.items).toLocaleString()}
                    </span>
                  </div>
                  {formik.values.is_use_tax && (
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>
                        {t("submission.total.taxAmount")} (
                        {formik.values.tax_rate}%)
                      </span>
                      <span className="font-medium font-mono text-gray-900">
                        ¥{" "}
                        {calculateTax(
                          calculateSubtotal(formik.values.items),
                          formik.values.tax_rate,
                          true,
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="bg-primary rounded-xl p-4 flex items-center justify-between text-white shadow-lg shadow-primary/20">
                    <div className="text-sm font-bold uppercase tracking-wider">
                      {t("submission.total.calculated")}
                    </div>
                    <div className="text-2xl font-black font-mono">
                      ¥{" "}
                      {calculateTotal(
                        formik.values.items,
                        formik.values.tax_rate,
                        formik.values.is_use_tax,
                        formik.values.is_tax_included,
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="vendor_name"
                className="text-gray-700 font-medium"
              >
                {t("submission.field.vendor")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vendor_name"
                placeholder={t("submission.field.vendor.placeholder")}
                {...formik.getFieldProps("vendor_name")}
                className={cn(
                  "h-11",
                  formik.touched.vendor_name &&
                    formik.errors.vendor_name &&
                    "border-red-500",
                )}
              />
              {formik.touched.vendor_name && formik.errors.vendor_name && (
                <div className="text-red-500 text-sm">
                  {formik.errors.vendor_name}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="payment_schedule_date"
                  className="text-gray-700 font-medium"
                >
                  {t("submission.field.paymentDate")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    id="payment_schedule_date"
                    {...formik.getFieldProps("payment_schedule_date")}
                    className={cn(
                      "h-11 pr-10",
                      formik.touched.payment_schedule_date &&
                        formik.errors.payment_schedule_date &&
                        "border-red-500",
                    )}
                  />
                </div>
                {formik.touched.payment_schedule_date &&
                  formik.errors.payment_schedule_date && (
                    <div className="text-red-500 text-sm">
                      {formik.errors.payment_schedule_date}
                    </div>
                  )}
              </div>
              <div id="field-payment_method" className="grid gap-2">
                <Label
                  htmlFor="payment_method"
                  className="text-gray-700 font-medium"
                >
                  {t("submission.field.paymentMethod")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formik.values.payment_method}
                  onValueChange={(val) => {
                    formik.setFieldValue("payment_method", val);
                    formik.setFieldTouched("payment_method", true, false);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "h-11",
                      formik.touched.payment_method &&
                        formik.errors.payment_method &&
                        "border-red-500",
                    )}
                  >
                    <SelectValue
                      placeholder={t(
                        "submission.field.paymentMethod.placeholder",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">
                      {t("submission.payment.bank")}
                    </SelectItem>
                    <SelectItem value="Credit Card">
                      {t("submission.payment.credit")}
                    </SelectItem>
                    <SelectItem value="Cash">
                      {t("submission.payment.cash")}
                    </SelectItem>
                    <SelectItem value="Other">
                      {t("submission.payment.other")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formik.touched.payment_method &&
                  formik.errors.payment_method && (
                    <div className="text-red-500 text-sm">
                      {formik.errors.payment_method}
                    </div>
                  )}
              </div>
            </div>

            <div id="field-date" className="grid gap-2">
              <Label className="text-gray-700 font-medium">
                {t("submission.field.requiredDate")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  {...formik.getFieldProps("date")}
                  className={cn(
                    "h-11 flex-1",
                    formik.touched.date &&
                      formik.errors.date &&
                      "border-red-500",
                  )}
                />
              </div>
              {formik.touched.date && formik.errors.date && (
                <div className="text-red-500 text-sm">{formik.errors.date}</div>
              )}
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="reason_for_purchase"
                className="text-gray-700 font-medium"
              >
                {t("submission.field.reason")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason_for_purchase"
                placeholder={t("submission.field.reason.placeholder")}
                rows={3}
                {...formik.getFieldProps("reason_for_purchase")}
                className={cn(
                  "resize-none",
                  formik.touched.reason_for_purchase &&
                    formik.errors.reason_for_purchase &&
                    "border-red-500",
                )}
              />
              {formik.touched.reason_for_purchase &&
                formik.errors.reason_for_purchase && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.reason_for_purchase}
                  </div>
                )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="purpose" className="text-gray-700 font-medium">
                {t("submission.field.purpose")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="purpose"
                placeholder={t("submission.field.purpose.placeholder")}
                {...formik.getFieldProps("purpose")}
                className={cn(
                  "h-11",
                  formik.touched.purpose &&
                    formik.errors.purpose &&
                    "border-red-500",
                )}
              />
              {formik.touched.purpose && formik.errors.purpose && (
                <div className="text-red-500 text-sm">
                  {formik.errors.purpose}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remarks" className="text-gray-700 font-medium">
                {t("submission.field.remarks")}
              </Label>
              <Input
                id="remarks"
                placeholder={t("form.remarksPlaceholder")}
                {...formik.getFieldProps("remarks")}
                className="h-11"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-gray-700 font-medium">
                {t("submission.attachment.header")}
              </Label>
              <div className="space-y-3">
                <div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="submission-file-input"
                    accept=".pdf,.doc,.docx,.xlsx,.pptx,.csv,.txt,.md,.jpg,.jpeg,.png,.heic,.zip"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFileUpload(Array.from(e.target.files));
                        e.target.value = "";
                      }
                    }}
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById("submission-file-input")?.click()}
                    disabled={isUploading}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {isUploading ? t("submission.processing.upload") : t("submission.attachment.chooseFile")}
                  </Button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            {file.type === "url" ? (
                              <Paperclip className="w-4 h-4 text-gray-400" />
                            ) : (
                              <FileText className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {file.name}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {shouldBlockSubmit ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-amber-800">
                  <AlertTriangle className="w-5 h-5" />
                  {t("submission.noRoute.title")}
                </div>
                <p className="text-sm text-amber-700">
                  {t("submission.noRoute.description")}
                </p>
              </div>
            ) : (
              <ApprovalRouteTimeline
                status={(initialData?.status as "draft" | "pending" | "approved" | "rejected" | "need_revision" | "cancelled") || (isDraft ? "draft" : "pending")}
                stepApprovals={initialData?.step_approvals}
                steps={
                  !initialData?.step_approvals?.length && matchedRouteSteps.length > 0
                    ? [
                        {
                          id: "requester",
                          title: t("timeline.step.requester"),
                          status: "pending" as const,
                          subtitle: t("timeline.status.draft"),
                        },
                        ...matchedRouteSteps.map((s) => ({
                          id: s.id,
                          title: s.name,
                          status: "pending" as const,
                          subtitle: t("timeline.status.pending"),
                        })),
                      ]
                    : undefined
                }
              />
            )}
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("submission.submit.cancel")}
            </Button>
            {isDraft && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isSubmitting || isUploading}
                onClick={async () => {
                  try {
                    await draftValidationSchema.validate(formik.values, { abortEarly: false });
                  } catch {
                    toast.error(t("submission.titleRequired"));
                    return;
                  }
                  const document_ids = attachments
                    .filter((a) => a.type === "document" && a.id)
                    .map((a) => a.id as string);
                  const document_urls = attachments
                    .filter((a) => a.type === "url" && a.url)
                    .map((a) => a.url as string);
                  const totalAmount = calculateTotal(
                    formik.values.items,
                    formik.values.tax_rate,
                    formik.values.is_use_tax,
                    formik.values.is_tax_included,
                  );
                  saveDraftMutation.mutate({
                    ...formik.values,
                    amount: totalAmount,
                    document_ids,
                    document_urls,
                    status: "draft",
                    ...(initialData?.id ? { id: initialData.id } : {}),
                  });
                }}
              >
                {saveDraftMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {t("submission.submit.saveDraft")}
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
              disabled={isSubmitting || isUploading || shouldBlockSubmit}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {initialData?.status === "need_revision"
                ? t("approval.needRevision.resubmit")
                : initialData && !isDraft
                ? t("submission.submit.update")
                : t("submission.submit.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
