"use client";

import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/providers/LanguageProvider";
import { Notification, NotificationType } from "@/types/notification";

const typeConfig: Record<
  NotificationType,
  { icon: typeof Bell; bgColor: string; iconColor: string }
> = {
  approval_submitted: {
    icon: Clock,
    bgColor: "bg-figma-warning-light",
    iconColor: "text-figma-warning",
  },
  approval_approved: {
    icon: CheckCircle,
    bgColor: "bg-figma-success-light",
    iconColor: "text-figma-success",
  },
  approval_rejected: {
    icon: XCircle,
    bgColor: "bg-figma-error-light",
    iconColor: "text-figma-error",
  },
  approval_need_revision: {
    icon: AlertCircle,
    bgColor: "bg-figma-warning-light",
    iconColor: "text-figma-warning",
  },
  comment_added: {
    icon: MessageCircle,
    bgColor: "bg-figma-warning-light",
    iconColor: "text-figma-warning",
  },
  escalation_timeout: {
    icon: AlertTriangle,
    bgColor: "bg-figma-error-light",
    iconColor: "text-figma-error",
  },
  proxy_delegated: {
    icon: ShieldCheck,
    bgColor: "bg-figma-info-light",
    iconColor: "text-figma-info",
  },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

/** Highlight REQ-XXXX references in blue */
function renderMessage(message: string) {
  const parts = message.split(/(REQ-\d+)/g);
  return parts.map((part, i) =>
    /^REQ-\d+$/.test(part) ? (
      <span key={i} className="text-figma-primary font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function NotificationItem({
  notification,
  onRead,
  onClose,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const config = typeConfig[notification.type] ?? typeConfig.approval_submitted;
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
  };

  return (
    <div
      className="flex gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-figma-border last:border-b-0"
      onClick={handleClick}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center ${config.bgColor}`}
      >
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-normal text-foreground truncate">
            {notification.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {timeAgo(notification.created_at)}
            </span>
            {!notification.is_read && (
              <span className="w-[6px] h-[6px] rounded-full bg-figma-primary flex-shrink-0" />
            )}
          </div>
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {renderMessage(notification.message)}
          </p>
        )}
        {notification.approval_request_id && (
          <Link
            href={`/approval-requests/${notification.approval_request_id}`}
            className="inline-flex items-center gap-1 text-xs text-figma-primary hover:opacity-80 mt-1"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
              onClose();
            }}
          >
            {t("notifications.viewDetails")}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const {
    notifications,
    needsActionCount,
    needsActionNotifications,
    isLoading,
    markRead,
  } = useNotifications();

  const renderList = (items: Notification[]) => {
    if (isLoading) {
      return (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="p-6 text-center text-sm text-muted-foreground">
          {t("notifications.empty")}
        </div>
      );
    }

    return items.map((n) => (
      <NotificationItem
        key={n.id}
        notification={n}
        onRead={markRead}
        onClose={() => setOpen(false)}
      />
    ));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="h-5 w-5" />
          {needsActionCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-figma-primary text-[10px] font-bold text-white flex items-center justify-center">
              {needsActionCount > 99 ? "99+" : needsActionCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-figma-border">
          <h3 className="font-semibold text-[15px] text-foreground">
            {t("notifications.title")}
          </h3>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 pb-2">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full h-[35px] bg-figma-surface rounded-lg p-[3px]">
              <TabsTrigger
                value="all"
                className="flex-1 h-[29px] rounded-lg text-xs font-semibold text-figma-light data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-figma-border data-[state=active]:text-figma-primary data-[state=active]:shadow-none"
              >
                {t("notifications.all")}
              </TabsTrigger>
              <TabsTrigger
                value="needsAction"
                className="flex-1 h-[29px] rounded-lg text-xs font-semibold text-figma-light data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-figma-border data-[state=active]:text-figma-primary data-[state=active]:shadow-none"
              >
                <span>{t("notifications.needsAction")}</span>
                {needsActionCount > 0 && (
                  <span className="ml-1 w-[10px] h-[10px] rounded-full bg-figma-disabled text-[6px] font-semibold text-figma-surface flex items-center justify-center">
                    {needsActionCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <ScrollArea className="max-h-[340px]">
                {renderList(notifications)}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="needsAction" className="mt-0">
              <ScrollArea className="max-h-[340px]">
                {renderList(needsActionNotifications)}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}
