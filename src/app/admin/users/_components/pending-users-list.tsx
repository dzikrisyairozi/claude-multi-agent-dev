"use client";

import { useState } from "react";
import { Profile } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Clock, RotateCw } from "lucide-react";
import { rejectUser, resendInvite } from "@/service/admin/user";
import { toast } from "sonner";
import { useLanguage } from "@/providers/LanguageProvider";
import { useQueryClient } from "@tanstack/react-query";
import { ApproveUserDialog } from "./approve-user-dialog";

interface PendingUsersListProps {
  users: Profile[];
  onRefresh: () => void;
}

export function PendingUsersList({ users, onRefresh }: PendingUsersListProps) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [resendUserId, setResendUserId] = useState<string | null>(null);
  const [approveUser, setApproveUser] = useState<Profile | null>(null);

  if (users.length === 0) return null;

  const getDisplayName = (user: Profile): string => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    if (user.display_name) {
      return user.display_name;
    }
    return user.email || "Unknown User";
  };

  const getInitials = (user: Profile): string => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.display_name) {
      const parts = user.display_name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.display_name.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const handleRejectConfirm = async () => {
    if (!rejectUserId) return;
    setProcessingId(rejectUserId);
    try {
      const result = await rejectUser(rejectUserId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("pendingUsers.rejectSuccess"));
        queryClient.invalidateQueries({ queryKey: ["users"] });
        onRefresh();
      }
    } catch {
      toast.error(t("pendingUsers.rejectFailed"));
    } finally {
      setProcessingId(null);
      setRejectUserId(null);
    }
  };

  const handleResendConfirm = async () => {
    if (!resendUserId) return;
    setProcessingId(resendUserId);
    try {
      const result = await resendInvite(resendUserId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("userTable.resendSuccess"));
        queryClient.invalidateQueries({ queryKey: ["users"] });
        onRefresh();
      }
    } catch {
      toast.error(t("userTable.resendFailed"));
    } finally {
      setProcessingId(null);
      setResendUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === "ja" ? "ja-JP" : "en-US",
      {
        month: "long",
        day: "2-digit",
        year: "numeric",
      },
    );
  };

  return (
    <>
      <div className="rounded-lg border-2 border-orange-200 overflow-hidden mb-8">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="p-2 rounded bg-orange-400 text-white">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900">{t("pendingUsers.title")}</h3>
          <Badge
            variant="secondary"
            className="bg-orange-400 text-white hover:bg-orange-400 border-none rounded-sm"
          >
            {users.length}
          </Badge>
        </div>
        <div className="bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-orange-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">{t("pendingUsers.name")}</th>
                <th className="px-6 py-3">{t("pendingUsers.email")}</th>
                <th className="px-6 py-3">{t("pendingUsers.requestedDate")}</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-orange-50/50 transition-colors border border-orange-100"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-gray-100 border border-gray-200">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-gray-600 font-medium">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-gray-900">
                        {getDisplayName(user)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 w-24"
                        onClick={() => setResendUserId(user.id)}
                        disabled={processingId === user.id}
                      >
                        <RotateCw className="w-4 h-4" /> {t("pendingUsers.resend")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-red-500 hover:bg-red-600 text-white gap-1 w-24"
                        onClick={() => setRejectUserId(user.id)}
                        disabled={processingId === user.id}
                      >
                        <X className="w-4 h-4" /> {t("pendingUsers.reject")}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 w-24"
                        onClick={() => setApproveUser(user)}
                        disabled={processingId === user.id}
                      >
                        <Check className="w-4 h-4" /> {t("pendingUsers.approve")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Confirmation Dialog */}
      <AlertDialog
        open={!!rejectUserId}
        onOpenChange={(open) => !open && setRejectUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pendingUsers.rejectConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pendingUsers.rejectConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("pendingUsers.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t("pendingUsers.reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resend Confirmation Dialog */}
      <AlertDialog
        open={!!resendUserId}
        onOpenChange={(open) => !open && setResendUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pendingUsers.resendConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pendingUsers.resendConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("pendingUsers.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResendConfirm}>
              {t("pendingUsers.resend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Dialog with Form */}
      <ApproveUserDialog
        user={approveUser}
        onOpenChange={(open) => !open && setApproveUser(null)}
        onSuccess={onRefresh}
      />
    </>
  );
}
