"use client";

import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCategoryType } from "@/service/admin/categoryType";
import { CategoryType } from "@/types/categoryType";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface EditCategoryTypeSheetProps {
  categoryType: CategoryType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const getEditCategoryTypeSchema = (t: TranslationFn) =>
  Yup.object().shape({
    name: Yup.string().required(t("categoryTypes.nameRequired")),
    notes: Yup.string(),
  });

export function EditCategoryTypeSheet({
  categoryType,
  open,
  onOpenChange,
  onSuccess,
}: EditCategoryTypeSheetProps) {
  const { t } = useLanguage();

  const formik = useFormik({
    initialValues: {
      name: "",
      notes: "",
    },
    validationSchema: getEditCategoryTypeSchema(t),
    onSubmit: async (values, { setSubmitting }) => {
      if (!categoryType) return;
      try {
        const { error } = await updateCategoryType({
          id: categoryType.id,
          name: values.name,
          notes: values.notes || undefined,
        });

        if (error) {
          toast.error(error);
        } else {
          toast.success(t("categoryTypes.updateSuccess"));
          onOpenChange(false);
          onSuccess();
        }
      } catch {
        toast.error(t("categoryTypes.updateFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (categoryType) {
      formik.setValues({
        name: categoryType.name || "",
        notes: categoryType.notes || "",
      });
    } else {
      formik.resetForm();
    }
  }, [categoryType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("categoryTypes.edit")}</DialogTitle>
          <DialogDescription>{t("categoryTypes.editDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="edit-name">{t("categoryTypes.name")}</Label>
            <Input
              id="edit-name"
              name="name"
              placeholder={t("categoryTypes.namePlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-sm text-red-500">
                {formik.errors.name}
              </div>
            ) : null}
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="edit-notes">{t("categoryTypes.notes")}</Label>
            <Textarea
              id="edit-notes"
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
              {t("categoryTypes.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
