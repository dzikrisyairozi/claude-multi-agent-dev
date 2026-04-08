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
import { createPosition } from "@/service/admin/position";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface CreatePositionDialogProps {
  onSuccess: () => void;
}

const getCreatePositionSchema = (t: TranslationFn) =>
  Yup.object().shape({
    name: Yup.string().required(t("positions.nameRequired")),
    level: Yup.number()
      .required(t("positions.levelRequired"))
      .min(1, t("positions.levelMin"))
      .max(99, t("positions.levelMax")),
    description: Yup.string(),
  });

export function CreatePositionDialog({
  onSuccess,
}: CreatePositionDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: "",
      level: 1,
      description: "",
    },
    validationSchema: getCreatePositionSchema(t),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const { error } = await createPosition({
          name: values.name,
          level: values.level,
          description: values.description || undefined,
        });
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("positions.createSuccess"));
          setOpen(false);
          resetForm();
          onSuccess();
        }
      } catch {
        toast.error(t("positions.createFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> {t("positions.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("positions.createDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("positions.createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">{t("positions.name")}</Label>
            <Input
              id="name"
              name="name"
              placeholder={t("positions.namePlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-sm text-red-500">{formik.errors.name}</div>
            ) : null}
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="level">{t("positions.level")}</Label>
            <Input
              id="level"
              name="level"
              type="number"
              min={1}
              max={99}
              placeholder={t("positions.levelPlaceholder")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.level}
            />
            {formik.touched.level && formik.errors.level ? (
              <div className="text-sm text-red-500">{formik.errors.level}</div>
            ) : null}
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="description">{t("positions.description")}</Label>
            <Input
              id="description"
              name="description"
              placeholder={t("positions.descriptionPlaceholder")}
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
              {t("positions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
