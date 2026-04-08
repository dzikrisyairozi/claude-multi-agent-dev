"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/providers/LanguageProvider";
import type { NotificationEventConfig } from "@/types/notification-settings";

interface NotificationEventsCardProps {
  events: NotificationEventConfig[];
  onToggle: (eventKey: string, channel: "email" | "slack") => void;
}

export function NotificationEventsCard({
  events,
  onToggle,
}: NotificationEventsCardProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          {t("settingsNotifications.notificationEvents")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("settingsNotifications.event")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("settingsNotifications.description")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                {t("settingsNotifications.email")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                {t("settingsNotifications.slack")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.key} className="hover:bg-transparent">
                <TableCell className="font-semibold text-[15px]">
                  {t(event.labelKey as Parameters<typeof t>[0])}
                </TableCell>
                <TableCell className="text-[15px] text-muted-foreground">
                  {t(event.descriptionKey as Parameters<typeof t>[0])}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={event.email}
                      onCheckedChange={() => onToggle(event.key, "email")}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={event.slack}
                      onCheckedChange={() => onToggle(event.key, "slack")}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
