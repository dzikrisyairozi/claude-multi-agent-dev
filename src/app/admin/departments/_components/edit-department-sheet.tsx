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
import { updateDepartment } from "@/service/admin/department";
import { Department } from "@/types/department";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface EditDepartmentSheetProps {
  department: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const getEditDepartmentSchema = (t: TranslationFn) =>
  Yup.object().shape({
    name: Yup.string().required(t("departments.nameRequired")),
    description: Yup.string(),
  });

export function EditDepartmentSheet({
  department,
  open,
  onOpenChange,
  onSuccess,
}: EditDepartmentSheetProps) {
  const { t } = useLanguage();

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      isActive: true,
    },
    validationSchema: getEditDepartmentSchema(t),
    onSubmit: async (values, { setSubmitting }) => {
      if (!department) return;
      try {
        const { error } = await updateDepartment({
          id: department.id,
          name: values.name,
          description: values.description,
          is_active: values.isActive,
        });

        if (error) {
          toast.error(error);
        } else {
          toast.success(t("departments.updateSuccess"));
          onOpenChange(false);
          onSuccess();
        }
      } catch {
        toast.error(t("departments.updateFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Update form values when department prop changes
  useEffect(() => {
    if (department) {
      formik.setValues({
        name: department.name || "",
        description: department.description || "",
        isActive: department.is_active,
      });
    } else {
      formik.resetForm();
    }
  }, [department]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("departments.edit")}</SheetTitle>
          <SheetDescription>{t("departments.editDescription")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-1 flex-col gap-4 px-4 py-4"
        >
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-name">{t("departments.name")}</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder={t("departments.namePlaceholder")}
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
              <Label htmlFor="edit-description">
                {t("departments.description")}
              </Label>
              <Input
                id="edit-description"
                name="description"
                placeholder={t("departments.descriptionPlaceholder")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.description}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-isActive">
                  {t("departments.accountStatus")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {formik.values.isActive
                    ? t("departments.statusActive")
                    : t("departments.statusInactive")}
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
              {t("departments.saveChanges")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
