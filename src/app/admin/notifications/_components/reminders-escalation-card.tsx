"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/providers/LanguageProvider";
import type { ReminderSettings } from "@/types/notification-settings";

interface RemindersEscalationCardProps {
  reminders: ReminderSettings;
  onToggle: (key: keyof ReminderSettings) => void;
}

export function RemindersEscalationCard({
  reminders,
  onToggle,
}: RemindersEscalationCardProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          {t("settingsNotifications.remindersEscalation")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] text-foreground">
              {t("settingsNotifications.reminder24h")}
            </p>
            <p className="text-[15px] text-muted-foreground">
              {t("settingsNotifications.reminder24hDesc")}
            </p>
          </div>
          <Switch
            checked={reminders.reminder24h}
            onCheckedChange={() => onToggle("reminder24h")}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] text-foreground">
              {t("settingsNotifications.reminder72h")}
            </p>
            <p className="text-[15px] text-muted-foreground">
              {t("settingsNotifications.reminder72hDesc")}
            </p>
          </div>
          <Switch
            checked={reminders.reminder72h}
            onCheckedChange={() => onToggle("reminder72h")}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] text-foreground">
              {t("settingsNotifications.autoEscalation")}
            </p>
            <p className="text-[15px] text-muted-foreground">
              {t("settingsNotifications.autoEscalationDesc")}
            </p>
          </div>
          <Switch
            checked={reminders.autoEscalation}
            onCheckedChange={() => onToggle("autoEscalation")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
