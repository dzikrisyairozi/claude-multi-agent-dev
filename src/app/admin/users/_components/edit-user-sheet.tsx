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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateUser } from "@/service/admin/user";
import { getActiveDepartments } from "@/service/admin/department";
import { getActivePositions } from "@/service/admin/position";
import { Profile, UserRole } from "@/types/user";
import { Department } from "@/types/department";
import { Position } from "@/types/position";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface EditUserSheetProps {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const getEditUserSchema = (t: TranslationFn) =>
  Yup.object().shape({
    firstName: Yup.string().required(t("editUser.firstNameRequired")),
    lastName: Yup.string().required(t("editUser.lastNameRequired")),
    role: Yup.string().required(t("editUser.roleRequired")),
  });

export function EditUserSheet({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserSheetProps) {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // Fetch departments and positions on mount
  useEffect(() => {
    getActiveDepartments().then((res) => {
      if (res.data) setDepartments(res.data);
    });
    getActivePositions().then((res) => {
      if (res.data) setPositions(res.data);
    });
  }, []);

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      role: "requester" as UserRole,
      isActive: true,
      departmentId: "",
      positionId: "",
    },
    validationSchema: getEditUserSchema(t),
    onSubmit: async (values, { setSubmitting }) => {
      if (!user) return;
      try {
        const { error } = await updateUser({
          id: user.id,
          role: values.role,
          firstName: values.firstName,
          lastName: values.lastName,
          isActive: values.isActive,
          departmentId: values.departmentId || null,
          positionId: values.positionId || null,
        });

        if (error) {
          toast.error(error);
        } else {
          toast.success(t("editUser.updateSuccess"));
          onOpenChange(false);
          onSuccess();
        }
      } catch {
        toast.error(t("editUser.updateFailed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Update form values when user prop changes
  useEffect(() => {
    if (user) {
      formik.setValues({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        role: user.role,
        isActive: user.is_active ?? true,
        departmentId: user.department_id || "",
        positionId: user.position_id || "",
      });
    } else {
      formik.resetForm();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("editUser.title")}</SheetTitle>
          <SheetDescription>{t("editUser.description")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-1 flex-col gap-4 px-4 py-4"
        >
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-firstName">{t("editUser.firstName")}</Label>
              <Input
                id="edit-firstName"
                name="firstName"
                placeholder={t("editUser.firstNamePlaceholder")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.firstName}
              />
              {formik.touched.firstName && formik.errors.firstName ? (
                <div className="text-sm text-red-500">
                  {formik.errors.firstName}
                </div>
              ) : null}
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-lastName">{t("editUser.lastName")}</Label>
              <Input
                id="edit-lastName"
                name="lastName"
                placeholder={t("editUser.lastNamePlaceholder")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.lastName}
              />
              {formik.touched.lastName && formik.errors.lastName ? (
                <div className="text-sm text-red-500">
                  {formik.errors.lastName}
                </div>
              ) : null}
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-role">{t("editUser.role")}</Label>
              <Select
                value={formik.values.role}
                onValueChange={(val) => formik.setFieldValue("role", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("editUser.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">
                    {t("role.requester")}
                  </SelectItem>
                  <SelectItem value="approver">
                    {t("role.approver")}
                  </SelectItem>
                  <SelectItem value="accounting">
                    {t("role.accounting")}
                  </SelectItem>
                  <SelectItem value="admin">{t("role.admin")}</SelectItem>
                  <SelectItem value="platform_admin">
                    {t("role.platform_admin")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {formik.touched.role && formik.errors.role ? (
                <div className="text-sm text-red-500">{formik.errors.role}</div>
              ) : null}
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-departmentId">
                {t("editUser.department")}
              </Label>
              <Select
                value={formik.values.departmentId}
                onValueChange={(val) =>
                  formik.setFieldValue("departmentId", val === "none" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("editUser.selectDepartment")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("editUser.none")}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="edit-positionId">
                {t("editUser.position")}
              </Label>
              <Select
                value={formik.values.positionId}
                onValueChange={(val) =>
                  formik.setFieldValue("positionId", val === "none" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("editUser.selectPosition")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("editUser.none")}</SelectItem>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-isActive">
                  {t("editUser.accountStatus")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {formik.values.isActive
                    ? t("editUser.accountActive")
                    : t("editUser.accountInactive")}
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
              {t("editUser.saveChanges")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
