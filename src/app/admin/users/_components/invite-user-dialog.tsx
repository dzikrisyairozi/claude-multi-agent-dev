"use client";

import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { Loader2, Plus, Mail, User } from "lucide-react";

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
import { inviteUser } from "@/service/admin/user";
import { getActiveDepartments } from "@/service/admin/department";
import { getActivePositions } from "@/service/admin/position";
import { UserRole } from "@/types/user";
import { Department } from "@/types/department";
import { Position } from "@/types/position";
import { useLanguage, TranslationFn } from "@/providers/LanguageProvider";

interface InviteUserDialogProps {
  onSuccess: () => void;
}

const getInviteUserSchema = (t: TranslationFn) =>
  Yup.object().shape({
    email: Yup.string()
      .email(t("inviteUser.emailInvalid"))
      .required(t("inviteUser.emailRequired")),
    firstName: Yup.string().required(t("inviteUser.firstNameRequired")),
    lastName: Yup.string().required(t("inviteUser.lastNameRequired")),
    role: Yup.string().required(t("inviteUser.roleRequired")),
  });

export function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
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
      email: "",
      firstName: "",
      lastName: "",
      role: "requester" as UserRole,
      departmentId: "",
      positionId: "",
    },
    validationSchema: getInviteUserSchema(t),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const { error } = await inviteUser({
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          role: values.role,
          departmentId: values.departmentId || undefined,
          positionId: values.positionId || undefined,
        });
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("inviteUser.success"));
          setOpen(false);
          resetForm();
          onSuccess();
        }
      } catch {
        toast.error(t("inviteUser.failed"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> {t("inviteUser.inviteButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("inviteUser.title")}</DialogTitle>
          <DialogDescription>{t("inviteUser.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="email">{t("inviteUser.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("inviteUser.emailPlaceholder")}
                className="pl-9"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.email}
              />
            </div>
            {formik.touched.email && formik.errors.email ? (
              <div className="text-sm text-red-500">{formik.errors.email}</div>
            ) : null}
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="firstName">{t("inviteUser.firstName")}</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                name="firstName"
                placeholder={t("inviteUser.firstNamePlaceholder")}
                className="pl-9"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.firstName}
              />
            </div>
            {formik.touched.firstName && formik.errors.firstName ? (
              <div className="text-sm text-red-500">
                {formik.errors.firstName}
              </div>
            ) : null}
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="lastName">{t("inviteUser.lastName")}</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="lastName"
                name="lastName"
                placeholder={t("inviteUser.lastNamePlaceholder")}
                className="pl-9"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.lastName}
              />
            </div>
            {formik.touched.lastName && formik.errors.lastName ? (
              <div className="text-sm text-red-500">
                {formik.errors.lastName}
              </div>
            ) : null}
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="role">{t("inviteUser.role")}</Label>
            <Select
              value={formik.values.role}
              onValueChange={(val) => formik.setFieldValue("role", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("inviteUser.selectRole")} />
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
            <Label htmlFor="departmentId">
              {t("inviteUser.department")}
            </Label>
            <Select
              value={formik.values.departmentId}
              onValueChange={(val) =>
                formik.setFieldValue(
                  "departmentId",
                  val === "none" ? "" : val,
                )
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("inviteUser.selectDepartment")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("inviteUser.none")}</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="positionId">
              {t("inviteUser.position")}
            </Label>
            <Select
              value={formik.values.positionId}
              onValueChange={(val) =>
                formik.setFieldValue(
                  "positionId",
                  val === "none" ? "" : val,
                )
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("inviteUser.selectPosition")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("inviteUser.none")}</SelectItem>
                {positions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id}>
                    {pos.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("inviteUser.invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
