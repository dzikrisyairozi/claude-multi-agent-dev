"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { PermissionMatrix } from "./_components/permission-matrix";

export default function PermissionsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("permissions.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("permissions.subtitle")}
        </p>
      </div>

      <PermissionMatrix />
    </div>
  );
}
