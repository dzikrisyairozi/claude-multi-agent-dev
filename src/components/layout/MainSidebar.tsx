"use client";

import {
  LayoutGrid,
  MessageSquare,
  Folder,
  Users,
  Sparkles,
  Activity,
  Building2,
  BadgeCheck,
  Shield,
  Receipt,
  Settings,
  FileText,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";

interface MainSidebarProps {
  className?: string;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface NavIconProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}

const requesterNavItems: NavItem[] = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
  { icon: MessageSquare, label: "AI Chat", href: "/c" },
  { icon: HelpCircle, label: "AI Support", href: "/mgapp" },
  { icon: Folder, label: "Files", href: "/files" },
  { icon: Activity, label: "Activity Log", href: "/activity-log" },
];

const approverNavItems: NavItem[] = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
  { icon: MessageSquare, label: "AI Chat", href: "/c" },
  { icon: HelpCircle, label: "AI Support", href: "/mgapp" },
  { icon: Folder, label: "Files", href: "/files" },
  { icon: Activity, label: "Activity Log", href: "/activity-log" },
];

const accountingNavItems: NavItem[] = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
  { icon: Receipt, label: "Reports", href: "/reports" },
  { icon: HelpCircle, label: "AI Support", href: "/mgapp" },
  { icon: Folder, label: "Files", href: "/files" },
  { icon: Activity, label: "Activity Log", href: "/activity-log" },
];

const adminNavItems: NavItem[] = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Building2, label: "Departments", href: "/admin/departments" },
  { icon: BadgeCheck, label: "Positions", href: "/admin/positions" },
  { icon: Shield, label: "Permissions", href: "/admin/permissions" },
  { icon: BookOpen, label: "Knowledge Base", href: "/admin/knowledge-base" },
  { icon: Folder, label: "Files", href: "/files" },
  { icon: HelpCircle, label: "AI Support", href: "/mgapp" },
  { icon: Activity, label: "Activity Log", href: "/activity-log" },
  { icon: Settings, label: "Settings", href: "/admin/approval-routes" },
];

export function MainSidebar({ className }: MainSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const role = user?.user_metadata?.role;
  const navItems =
    role === "platform_admin" || role === "admin"
      ? adminNavItems
      : role === "accounting"
      ? accountingNavItems
      : role === "approver"
      ? approverNavItems
      : requesterNavItems;

  return (
    <div
      className={cn(
        "flex flex-col items-center w-[70px] h-full border-r bg-white py-6 gap-8",
        className
      )}
    >
      <Link href="/">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-glow">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
      </Link>

      {/* Navigation Icons */}
      <nav className="flex flex-col items-center gap-6 w-full px-2">
        {navItems.map((item) => (
          <NavIcon
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={
              item.label === "Settings"
                ? pathname.startsWith("/admin/approval-routes") || pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/notifications")
                : pathname === item.href || pathname.startsWith(item.href + "/")
            }
          />
        ))}
      </nav>
    </div>
  );
}

function NavIcon({ icon: Icon, label, href, active }: NavIconProps) {
  return (
    <Link href={href} prefetch={false}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-10 h-10 rounded-xl",
          active
            ? "bg-sky-100 text-sky-500 hover:bg-sky-200 hover:text-sky-600"
            : "text-muted-foreground hover:bg-muted"
        )}
        aria-label={label}
      >
        <Icon className="w-5 h-5" />
      </Button>
    </Link>
  );
}
