"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconFileImport, IconSearch } from "@tabler/icons-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApprovalRoutes } from "@/service/approvalRoute/approvalRoute";
import { ApprovalRouteDetailForm } from "./_components/approval-route-detail-form";
import { ApprovalRouteCards } from "./_components/approval-route-cards";
import { ImportCsvDialog } from "./_components/import-csv-dialog";
import { useLanguage } from "@/providers/LanguageProvider";
import { SettingsSidebar } from "@/components/admin/settings-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";

export default function ApprovalRoutesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user } = useAuth();

  const selectedRouteId = searchParams.get("id");
  const isCreating = searchParams.get("new") === "1";
  const mode = isCreating ? "create" : selectedRouteId ? "view" : "list";

  const [formKey, setFormKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const { searchValue, debouncedValue: searchQuery, setSearchValue, isPending: isSearchPending } = useSearch("", 300);

  const {
    data: result,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["approval-routes", searchQuery],
    queryFn: () => getApprovalRoutes(searchQuery || undefined),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const routes = result?.data ?? [];
  const selectedRoute =
    mode === "view"
      ? (routes.find((r) => r.id === selectedRouteId) ?? null)
      : null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["approval-routes"] });
  };

  const handleNewRoute = () => {
    router.push(`${pathname}?new=1`);
    setFormKey((k) => k + 1);
  };

  const handleSelectRoute = (routeId: string) => {
    router.push(`${pathname}?id=${routeId}`);
  };

  const handleSuccess = () => {
    handleRefresh();
    router.push(pathname); // Navigate back to list
  };

  const handleCancel = () => {
    router.push(pathname);
    setFormKey((k) => k + 1);
  };

  const showDetail = mode === "create" || (mode === "view" && selectedRoute !== null);
  const detailKey =
    mode === "create"
      ? `create-${formKey}`
      : `view-${selectedRouteId}-${formKey}`;

  return (
    <SettingsSidebar activeItem="approval-routes">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("approvalRoute.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {t("approvalRoute.subtitle")}
            </p>
          </div>
          {mode === "list" && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search routes..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9 w-[200px] h-9"
                />
              </div>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <IconFileImport className="size-4 mr-2" />
                {t("approvalRoute.importCsv")}
              </Button>
              <Button onClick={handleNewRoute}>
                <IconPlus className="size-4 mr-1.5" />
                {t("approvalRoute.newRoute")}
              </Button>
            </div>
          )}
        </div>

        {/* Error */}
        {(error || result?.error) && (
          <Alert variant="destructive">
            <AlertDescription>
              {result?.error ?? t("approvalRoute.failedToLoad")}
            </AlertDescription>
          </Alert>
        )}

        {/* Content: List or Detail */}
        {showDetail ? (
          <ApprovalRouteDetailForm
            key={detailKey}
            route={selectedRoute}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <ApprovalRouteCards
            routes={routes}
            isLoading={isLoading || isSearchPending}
            onSelect={handleSelectRoute}
            onDelete={handleRefresh}
          />
        )}

        <ImportCsvDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onSuccess={handleRefresh}
        />
      </div>
    </SettingsSidebar>
  );
}
