"use client";

import Link from "next/link";
import { Route, Tag, Shield, Bell } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/utils";

type ActiveItem = "approval-routes" | "categories" | "notifications";

interface SettingsSidebarProps {
  activeItem: ActiveItem;
  children: React.ReactNode;
}

const sidebarItems = [
  {
    key: "approval-routes" as const,
    icon: Route,
    labelKey: "settings.approvalRoutes" as const,
    href: "/admin/approval-routes",
    disabled: false,
  },
  {
    key: "categories" as const,
    icon: Tag,
    labelKey: "settings.categoriesType" as const,
    href: "/admin/categories",
    disabled: false,
  },
  {
    key: "security" as const,
    icon: Shield,
    labelKey: "settings.securityAudit" as const,
    href: "#",
    disabled: true,
  },
  {
    key: "notifications" as const,
    icon: Bell,
    labelKey: "settings.notifications" as const,
    href: "/admin/notifications",
    disabled: false,
  },
];

export function SettingsSidebar({ activeItem, children }: SettingsSidebarProps) {
  const { t } = useLanguage();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-[284px] shrink-0 border-r bg-white">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight">
            {t("settings.title")}
          </h2>
          <p className="text-[15px] text-muted-foreground">
            {t("settings.subtitle")}
          </p>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {sidebarItems.map((item) => {
            const isActive = item.key === activeItem;
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#d5d5d5] cursor-not-allowed"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{t(item.labelKey)}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  isActive
                    ? "bg-[#eff3f6] text-sky-500 font-semibold"
                    : "text-muted-foreground hover:bg-gray-50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
