"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Shield, User, Search, Filter, UserMinus, MailCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Profile } from "@/types/user";
import { toast } from "sonner";
import { deleteUser, resendInvite } from "@/service/admin/user";
import { useState, useEffect } from "react";
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
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/table-pagination";
import { useLanguage } from "@/providers/LanguageProvider";

interface UserTableProps {
  users: Profile[];
  onEdit: (user: Profile) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function UserTable({
  users,
  onEdit,
  onRefresh,
  isLoading,
  inviteButton,
}: UserTableProps & { inviteButton?: React.ReactNode }) {
  const { t, language } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Helper function to get display name with proper prioritization
  const getDisplayName = (user: Profile): string => {
    // Prioritize first_name and last_name from profile
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    // Fall back to display_name from auth (Google OAuth)
    if (user.display_name) {
      return user.display_name;
    }
    // Last resort: use email
    return user.email || "Unknown User";
  };

  // Helper function to get initials for avatar
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

  // Filter users based on search and roles
  const filteredUsers = users.filter((user) => {
    const displayName = getDisplayName(user).toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      displayName.includes(searchLower) ||
      (user.first_name?.toLowerCase() || "").includes(searchLower) ||
      (user.last_name?.toLowerCase() || "").includes(searchLower) ||
      (user.display_name?.toLowerCase() || "").includes(searchLower) ||
      (user.email?.toLowerCase() || "").includes(searchLower);

    const matchesRole =
      selectedRoles.length === 0 || selectedRoles.includes(user.role);

    return matchesSearch && matchesRole;
  });

  const {
    currentPage,
    totalPages,
    currentItems: currentUsers,
    setCurrentPage,
    startIndex,
    endIndex,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ items: filteredUsers, itemsPerPage: 10 });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRoles, setCurrentPage]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await deleteUser(deleteId);
      if (error) {
        toast.error(error);
      } else {
        toast.success(t("userTable.deleteSuccess"));
        onRefresh();
      }
    } catch {
      toast.error(t("userTable.deleteFailed"));
    } finally {
      setDeleteId(null);
    }
  };

  const handleResendInvite = async (userId: string) => {
    setResendingId(userId);
    try {
      const { error } = await resendInvite(userId);
      if (error) {
        toast.error(error);
      } else {
        toast.success(t("userTable.resendSuccess"));
        onRefresh();
      }
    } catch {
      toast.error(t("userTable.resendFailed"));
    } finally {
      setResendingId(null);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "platform_admin":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
            <Shield className="h-3.5 w-3.5 fill-red-600" />
            {t("role.platform_admin")}
          </div>
        );
      case "admin":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
            <User className="h-3.5 w-3.5 fill-blue-600" />
            {t("role.admin")}
          </div>
        );
      case "approver":
        return (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: "var(--figma-purple-light)", color: "var(--figma-purple)" }}
          >
            <User className="h-3.5 w-3.5" style={{ fill: "var(--figma-purple)" }} />
            {t("role.approver")}
          </div>
        );
      case "requester":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-600">
            <User className="h-3.5 w-3.5 fill-cyan-600" />
            {t("role.requester")}
          </div>
        );
      case "accounting":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
            <User className="h-3.5 w-3.5 fill-orange-600" />
            {t("role.accounting")}
          </div>
        );
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === "ja" ? "ja-JP" : "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className="relative w-full sm:w-[400px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("userTable.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-gray-50/50 border-gray-200"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-white">
                <Filter className="h-4 w-4" />
                {t("userTable.filter")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {t("userTable.filterByRole")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["requester", "approver", "accounting", "admin", "platform_admin"].map(
                (role) => (
                  <div
                    key={role}
                    className="flex items-center space-x-2 px-2 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => toggleRole(role)}
                  >
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleRole(role)}
                      id={`filter-${role}`}
                    />
                    <label
                      htmlFor={`filter-${role}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {role}
                    </label>
                  </div>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {inviteButton}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 py-4 px-5">
        {/* Table */}
        <div className="rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("userTable.name")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("userTable.email")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("userTable.role")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("userTable.department")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("userTable.position")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("userTable.createdAt")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("userTable.status")}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pr-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-gray-100">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : currentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {t("userTable.noUsersFound")}
                  </TableCell>
                </TableRow>
              ) : (
                currentUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <TableCell className="py-4">
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
                    </TableCell>
                    <TableCell className="py-4 text-gray-600">
                      {user.email}
                    </TableCell>
                    <TableCell className="py-4">
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell className="py-4 text-gray-600">
                      {user.department?.name || "-"}
                    </TableCell>
                    <TableCell className="py-4 text-gray-600">
                      {user.position?.name || "-"}
                    </TableCell>
                    <TableCell className="py-4 text-gray-600">
                      {user.created_at ? formatDate(user.created_at) : "-"}
                    </TableCell>
                    <TableCell className="py-4">
                      {user.is_active ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                          {t("userTable.active")}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {t("userTable.inactive")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        {!user.email_confirmed_at && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 text-amber-600"
                            onClick={() => handleResendInvite(user.id)}
                            disabled={resendingId === user.id}
                            title={t("userTable.resendInvite")}
                          >
                            <MailCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-900"
                          onClick={() => onEdit(user)}
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 text-red-600"
                          onClick={() => setDeleteId(user.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-gray-100 pt-4">
          {/* Footer / Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredUsers.length}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            goToPreviousPage={goToPreviousPage}
            goToNextPage={goToNextPage}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("userTable.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("userTable.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("userTable.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t("userTable.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
