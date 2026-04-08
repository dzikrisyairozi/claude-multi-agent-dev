"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers } from "@/service/admin/user";
import { Profile } from "@/types/user";
import { UserTable } from "./_components/user-table";
import { InviteUserDialog } from "./_components/invite-user-dialog";
import { EditUserSheet } from "./_components/edit-user-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PendingUsersList } from "./_components/pending-users-list";
import { useLanguage } from "@/providers/LanguageProvider";

export default function UsersPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const {
    data: usersResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const users = usersResult?.data ?? [];

  const pendingUsers = useMemo(
    () => users.filter((u) => u.is_active === null),
    [users],
  );
  const activeUsers = useMemo(
    () => users.filter((u) => u.is_active !== null),
    [users],
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setIsEditOpen(true);
  };

  const handleEditSuccess = () => {
    handleRefresh();
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("admin.users.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("admin.users.subtitle")}
          </p>
        </div>
      </div>

      {error || usersResult?.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("admin.users.error")}</AlertTitle>
          <AlertDescription>
            {usersResult?.error || t("admin.users.failedToLoad")}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <PendingUsersList users={pendingUsers} onRefresh={handleRefresh} />
          <UserTable
            users={activeUsers}
            isLoading={isLoading}
            onEdit={handleEdit}
            onRefresh={handleRefresh}
            inviteButton={<InviteUserDialog onSuccess={handleRefresh} />}
          />
        </>
      )}

      <EditUserSheet
        user={editingUser}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingUser(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
