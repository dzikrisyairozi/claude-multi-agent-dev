"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { createCategoryType } from "@/service/admin/categoryType";
import { ParentCategory } from "@/types/categoryType";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface CreateCategoryTypeDialogProps {
  category: ParentCategory;
  onSuccess: () => void;
}

const getCreateCategoryTypeSchema = (t: TranslationFn) =>
  Yup.object().shape({
    name: Yup.string().required(t("categoryTypes.nameRequired")),
    notes: Yup.string(),
  });

export function CreateCategoryTypeDialog({
  category,
  onSuccess,
}: CreateCategoryTypeDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: "",
      notes: "",
    },
    validationSchema: getCreateCategoryTypeSchema(t),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const { error } = await createCategoryType({
          category,
          name: values.name,
          notes: values.notes || undefined,
        });
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("categoryTypes.createSuccess"));
          setOpen(false);
          resetForm();
          onSuccess();
        }
      } catch {
        toast.error(t("categoryTypes.createFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) formik.resetForm();
    }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-white text-sky-500 hover:bg-gray-50 font-medium"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {t("categoryTypes.addType")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add {category === "contracts" ? "Contract" : category === "purchasing" ? "Purchasing" : category === "expenses" ? "Expenses" : "Other"} Category Type</DialogTitle>
          <DialogDescription>
            {t("categoryTypes.createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">{t("categoryTypes.name")}</Label>
            <Input
              id="name"
              name="name"
              placeholder={t("categoryTypes.namePlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-sm text-red-500">{formik.errors.name}</div>
            ) : null}
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="notes">{t("categoryTypes.notes")}</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder={t("categoryTypes.notesPlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.notes}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("categoryTypes.addType")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
