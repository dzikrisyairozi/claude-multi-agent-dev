"use client";

import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createKnowledgeEntry } from "@/service/mgapp/knowledgeBase";
import { getActiveDepartments } from "@/service/admin/department";
import { Department } from "@/types/department";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";
import { MgappCategory, AISolvability } from "@/types/mgapp";

interface CreateKnowledgeEntryDialogProps {
  onSuccess: () => void;
}

const getSchema = (t: TranslationFn) =>
  Yup.object().shape({
    category: Yup.string().required(t("knowledgeBase.categoryRequired")),
    question: Yup.string().required(t("knowledgeBase.questionRequired")),
    answer: Yup.string().required(t("knowledgeBase.answerRequired")),
    ai_solvability: Yup.string().required(t("knowledgeBase.solvabilityRequired")),
    routing_contact: Yup.string(),
    routing_channel: Yup.string(),
    routing_department: Yup.string(),
    source: Yup.string(),
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

export function CreateKnowledgeEntryDialog({
  onSuccess,
}: CreateKnowledgeEntryDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    getActiveDepartments().then((res) => {
      if (res.data) setDepartments(res.data);
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      category: "" as string,
      question: "",
      answer: "",
      ai_solvability: "ai_answerable" as string,
      routing_contact: "",
      routing_channel: "",
      routing_department: "",
      source: "",
    },
    validationSchema: getSchema(t),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const { error } = await createKnowledgeEntry({
          category: values.category as MgappCategory,
          question: values.question,
          answer: values.answer,
          ai_solvability: values.ai_solvability as AISolvability,
          routing_contact: values.routing_contact || undefined,
          routing_channel: values.routing_channel || undefined,
          routing_department: values.routing_department || undefined,
          source: values.source || undefined,
        });
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("knowledgeBase.createSuccess"));
          setOpen(false);
          resetForm();
          onSuccess();
        }
      } catch {
        toast.error(t("knowledgeBase.createFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> {t("knowledgeBase.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("knowledgeBase.createDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("knowledgeBase.createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label>{t("knowledgeBase.category")}</Label>
            <Select
              value={formik.values.category}
              onValueChange={(val) => formik.setFieldValue("category", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("knowledgeBase.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formik.touched.category && formik.errors.category ? (
              <div className="text-sm text-red-500">{formik.errors.category}</div>
            ) : null}
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label>{t("knowledgeBase.question")}</Label>
            <Textarea
              name="question"
              placeholder={t("knowledgeBase.questionPlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.question}
              rows={2}
            />
            {formik.touched.question && formik.errors.question ? (
              <div className="text-sm text-red-500">{formik.errors.question}</div>
            ) : null}
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label>{t("knowledgeBase.answer")}</Label>
            <Textarea
              name="answer"
              placeholder={t("knowledgeBase.answerPlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.answer}
              rows={3}
            />
            {formik.touched.answer && formik.errors.answer ? (
              <div className="text-sm text-red-500">{formik.errors.answer}</div>
            ) : null}
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label>{t("knowledgeBase.solvability")}</Label>
            <Select
              value={formik.values.ai_solvability}
              onValueChange={(val) => formik.setFieldValue("ai_solvability", val)}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.routingContact")}</Label>
              <Input
                name="routing_contact"
                placeholder={t("knowledgeBase.routingContactPlaceholder")}
                onChange={formik.handleChange}
                value={formik.values.routing_contact}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.routingChannel")}</Label>
              <Input
                name="routing_channel"
                placeholder={t("knowledgeBase.routingChannelPlaceholder")}
                onChange={formik.handleChange}
                value={formik.values.routing_channel}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label>{t("knowledgeBase.routingDepartment")}</Label>
              <Select
                value={formik.values.routing_department}
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
          </div>

          <DialogFooter>
            <Button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("knowledgeBase.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
