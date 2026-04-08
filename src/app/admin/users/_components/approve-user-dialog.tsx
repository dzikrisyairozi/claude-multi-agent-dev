"use client";

import { useEffect, useState } from "react";
import { Profile, UserRole } from "@/types/user";
import { Department } from "@/types/department";
import { Position } from "@/types/position";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Loader2 } from "lucide-react";
import { approveUser, updateUser } from "@/service/admin/user";
import { getActiveDepartments } from "@/service/admin/department";
import { getActivePositions } from "@/service/admin/position";
import { toast } from "sonner";
import { useLanguage } from "@/providers/LanguageProvider";
import { useQueryClient } from "@tanstack/react-query";

interface ApproveUserDialogProps {
  user: Profile | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApproveUserDialog({
  user,
  onOpenChange,
  onSuccess,
}: ApproveUserDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const [role, setRole] = useState<UserRole>("requester");
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    getActiveDepartments().then((res) => {
      if (res.data) setDepartments(res.data);
    });
    getActivePositions().then((res) => {
      if (res.data) setPositions(res.data);
    });
  }, []);

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setRole(user.role || "requester");
      setDepartmentId(user.department_id || "");
      setPositionId(user.position_id || "");
    }
  }, [user]);

  const isValid = !!role && !!departmentId && !!positionId;

  const handleApprove = async () => {
    if (!user || !isValid) return;
    setSubmitting(true);
    try {
      const { error: updateError } = await updateUser({
        id: user.id,
        role,
        departmentId,
        positionId,
      });
      if (updateError) {
        toast.error(updateError);
        return;
      }

      const { error } = await approveUser(user.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success(t("pendingUsers.approveSuccess"));
        queryClient.invalidateQueries({ queryKey: ["users"] });
        onOpenChange(false);
        onSuccess();
      }
    } catch {
      toast.error(t("pendingUsers.approveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pendingUsers.approveDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("pendingUsers.approveDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label>{t("editUser.role")}</Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as UserRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("editUser.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requester">{t("role.requester")}</SelectItem>
                <SelectItem value="approver">{t("role.approver")}</SelectItem>
                <SelectItem value="accounting">{t("role.accounting")}</SelectItem>
                <SelectItem value="admin">{t("role.admin")}</SelectItem>
                <SelectItem value="platform_admin">{t("role.platform_admin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label>{t("editUser.department")}</Label>
            <Select
              value={departmentId}
              onValueChange={(val) => setDepartmentId(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("editUser.selectDepartment")} />
              </SelectTrigger>
              <SelectContent>

                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label>{t("editUser.position")}</Label>
            <Select
              value={positionId}
              onValueChange={(val) => setPositionId(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("editUser.selectPosition")} />
              </SelectTrigger>
              <SelectContent>

                {positions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id}>
                    {pos.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("pendingUsers.cancel")}
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
            onClick={handleApprove}
            disabled={submitting || !isValid}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t("pendingUsers.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
