"use client";

import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateKnowledgeEntry } from "@/service/mgapp/knowledgeBase";
import { getActiveDepartments } from "@/service/admin/department";
import { Department } from "@/types/department";
import { MgappKnowledgeEntry, MgappCategory, AISolvability } from "@/types/mgapp";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface EditKnowledgeEntrySheetProps {
  entry: MgappKnowledgeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const getSchema = (t: TranslationFn) =>
  Yup.object().shape({
    question: Yup.string().required(t("knowledgeBase.questionRequired")),
    answer: Yup.string().required(t("knowledgeBase.answerRequired")),
  });

const CATEGORIES: { value: MgappCategory; label: string }[] = [
  { value: "hr", label: "HR / 人事" },
  { value: "product", label: "Product / 製品" },
  { value: "it", label: "IT" },
  { value: "legal", label: "Legal / 法務" },
  { value: "facilities", label: "Facilities / 総務" },
  { value: "admin_finance", label: "Admin & Finance / 経理" },
];

const SOLVABILITIES: { value: AISolvability; label: string }[] = [
  { value: "ai_answerable", label: "AI Direct (AI直接回答)" },
  { value: "ai_supported", label: "AI + Routing (AI＋案内)" },
  { value: "human_only", label: "Human Only (人間対応)" },
];

export function EditKnowledgeEntrySheet({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: EditKnowledgeEntrySheetProps) {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    getActiveDepartments().then((res) => {
      if (res.data) setDepartments(res.data);
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      category: "hr" as string,
      question: "",
      answer: "",
      ai_solvability: "ai_answerable" as string,
      routing_contact: "",
      routing_channel: "",
      routing_department: "",
      isActive: true,
    },
    validationSchema: getSchema(t),
    onSubmit: async (values, { setSubmitting }) => {
      if (!entry) return;
      try {
        const { error } = await updateKnowledgeEntry({
          id: entry.id,
          category: values.category as MgappCategory,
          question: values.question,
          answer: values.answer,
          ai_solvability: values.ai_solvability as AISolvability,
          routing_contact: values.routing_contact,
          routing_channel: values.routing_channel,
          routing_department: values.routing_department,
          is_active: values.isActive,
        });

        if (error) {
          toast.error(error);
        } else {
          toast.success(t("knowledgeBase.updateSuccess"));
          onOpenChange(false);
          onSuccess();
        }
      } catch {
        toast.error(t("knowledgeBase.updateFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (entry) {
      formik.setValues({
        category: entry.category,
        question: entry.question,
        answer: entry.answer,
        ai_solvability: entry.ai_solvability,
        routing_contact: entry.routing_contact || "",
        routing_channel: entry.routing_channel || "",
        routing_department: entry.routing_department || "",
        isActive: entry.is_active,
      });
    } else {
      formik.resetForm();
    }
  }, [entry]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("knowledgeBase.edit")}</SheetTitle>
          <SheetDescription>{t("knowledgeBase.editDescription")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-1 flex-col gap-4 px-4 py-4"
        >
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.category")}</Label>
              <Select
                value={formik.values.category}
                onValueChange={(val) => formik.setFieldValue("category", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.question")}</Label>
              <Textarea
                name="question"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.question}
                rows={2}
              />
              {formik.touched.question && formik.errors.question ? (
                <div className="text-sm text-red-500">
                  {formik.errors.question}
                </div>
              ) : null}
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.answer")}</Label>
              <Textarea
                name="answer"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.answer}
                rows={3}
              />
              {formik.touched.answer && formik.errors.answer ? (
                <div className="text-sm text-red-500">
                  {formik.errors.answer}
                </div>
              ) : null}
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.solvability")}</Label>
              <Select
                value={formik.values.ai_solvability}
                onValueChange={(val) =>
                  formik.setFieldValue("ai_solvability", val)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLVABILITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.routingContact")}</Label>
              <Input
                name="routing_contact"
                onChange={formik.handleChange}
                value={formik.values.routing_contact}
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.routingChannel")}</Label>
              <Input
                name="routing_channel"
                onChange={formik.handleChange}
                value={formik.values.routing_channel}
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.routingDepartment")}</Label>
              <Select
                value={formik.values.routing_department || "none"}
                onValueChange={(val) =>
                  formik.setFieldValue("routing_department", val === "none" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("knowledgeBase.routingDepartmentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>{t("knowledgeBase.accountStatus")}</Label>
                <p className="text-sm text-muted-foreground">
                  {formik.values.isActive
                    ? t("knowledgeBase.statusActive")
                    : t("knowledgeBase.statusInactive")}
                </p>
              </div>
              <Switch
                checked={formik.values.isActive}
                onCheckedChange={(checked: boolean) =>
                  formik.setFieldValue("isActive", checked)
                }
              />
            </div>
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("knowledgeBase.saveChanges")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
