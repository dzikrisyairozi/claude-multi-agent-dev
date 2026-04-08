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
import { createDepartment } from "@/service/admin/department";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface CreateDepartmentDialogProps {
  onSuccess: () => void;
}

const getCreateDepartmentSchema = (t: TranslationFn) =>
  Yup.object().shape({
    name: Yup.string().required(t("departments.nameRequired")),
    description: Yup.string(),
  });

export function CreateDepartmentDialog({
  onSuccess,
}: CreateDepartmentDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
    },
    validationSchema: getCreateDepartmentSchema(t),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const { error } = await createDepartment({
          name: values.name,
          description: values.description || undefined,
        });
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("departments.createSuccess"));
          setOpen(false);
          resetForm();
          onSuccess();
        }
      } catch {
        toast.error(t("departments.createFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> {t("departments.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("departments.createDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("departments.createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">{t("departments.name")}</Label>
            <Input
              id="name"
              name="name"
              placeholder={t("departments.namePlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-sm text-red-500">{formik.errors.name}</div>
            ) : null}
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="description">{t("departments.description")}</Label>
            <Input
              id="description"
              name="description"
              placeholder={t("departments.descriptionPlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.description}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("departments.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
