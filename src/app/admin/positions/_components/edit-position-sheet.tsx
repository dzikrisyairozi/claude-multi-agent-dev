"use client";

import { useEffect } from "react";
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
import { updatePosition } from "@/service/admin/position";
import { Position } from "@/types/position";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface EditPositionSheetProps {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const getEditPositionSchema = (t: TranslationFn) =>
  Yup.object().shape({
    name: Yup.string().required(t("positions.nameRequired")),
    level: Yup.number()
      .required(t("positions.levelRequired"))
      .min(1, t("positions.levelMin"))
      .max(99, t("positions.levelMax")),
    description: Yup.string(),
  });

export function EditPositionSheet({
  position,
  open,
  onOpenChange,
  onSuccess,
}: EditPositionSheetProps) {
  const { t } = useLanguage();

  const formik = useFormik({
    initialValues: {
      name: "",
      level: 1,
      description: "",
      isActive: true,
    },
    validationSchema: getEditPositionSchema(t),
    onSubmit: async (values, { setSubmitting }) => {
      if (!position) return;
      try {
        const { error } = await updatePosition({
          id: position.id,
          name: values.name,
          level: values.level,
          description: values.description,
          is_active: values.isActive,
        });

        if (error) {
          toast.error(error);
        } else {
          toast.success(t("positions.updateSuccess"));
          onOpenChange(false);
          onSuccess();
        }
      } catch {
        toast.error(t("positions.updateFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Update form values when position prop changes
  useEffect(() => {
    if (position) {
      formik.setValues({
        name: position.name || "",
        level: position.level,
        description: position.description || "",
        isActive: position.is_active,
      });
    } else {
      formik.resetForm();
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("positions.edit")}</SheetTitle>
          <SheetDescription>{t("positions.editDescription")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-1 flex-col gap-4 px-4 py-4"
        >
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-name">{t("positions.name")}</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder={t("positions.namePlaceholder")}
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
              <Label htmlFor="edit-level">{t("positions.level")}</Label>
              <Input
                id="edit-level"
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
                <div className="text-sm text-red-500">
                  {formik.errors.level}
                </div>
              ) : null}
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-description">
                {t("positions.description")}
              </Label>
              <Input
                id="edit-description"
                name="description"
                placeholder={t("positions.descriptionPlaceholder")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.description}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-isActive">
                  {t("positions.accountStatus")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {formik.values.isActive
                    ? t("positions.statusActive")
                    : t("positions.statusInactive")}
                </p>
              </div>
              <Switch
                id="edit-isActive"
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
              {t("positions.saveChanges")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
