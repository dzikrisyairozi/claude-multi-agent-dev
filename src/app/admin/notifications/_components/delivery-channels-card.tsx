"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/providers/LanguageProvider";
import type { DeliveryChannels } from "@/types/notification-settings";

interface DeliveryChannelsCardProps {
  channels: DeliveryChannels;
  onToggle: (key: keyof DeliveryChannels) => void;
}

export function DeliveryChannelsCard({
  channels,
  onToggle,
}: DeliveryChannelsCardProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          {t("settingsNotifications.deliveryChannels")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] text-foreground">
              {t("settingsNotifications.emailNotifications")}
            </p>
            <p className="text-[15px] text-muted-foreground">
              {t("settingsNotifications.emailNotificationsDesc")}
            </p>
          </div>
          <Switch
            checked={channels.emailNotifications}
            onCheckedChange={() => onToggle("emailNotifications")}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] text-foreground">
              {t("settingsNotifications.slackDm")}
            </p>
            <p className="text-[15px] text-muted-foreground">
              {t("settingsNotifications.slackDmDesc")}
            </p>
          </div>
          <Switch
            checked={channels.slackDm}
            onCheckedChange={() => onToggle("slackDm")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
