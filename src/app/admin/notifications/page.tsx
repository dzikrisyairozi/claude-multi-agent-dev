"use client";

import { useState } from "react";
import { SettingsSidebar } from "@/components/admin/settings-sidebar";
import { useLanguage } from "@/providers/LanguageProvider";
import { DeliveryChannelsCard } from "./_components/delivery-channels-card";
import { NotificationEventsCard } from "./_components/notification-events-card";
import { RemindersEscalationCard } from "./_components/reminders-escalation-card";
import type {
  DeliveryChannels,
  NotificationEventConfig,
  ReminderSettings,
} from "@/types/notification-settings";

const DEFAULT_EVENTS: NotificationEventConfig[] = [
  {
    key: "newSubmission",
    labelKey: "settingsNotifications.newSubmission",
    descriptionKey: "settingsNotifications.newSubmissionDesc",
    email: true,
    slack: true,
  },
  {
    key: "approvalRequired",
    labelKey: "settingsNotifications.approvalRequired",
    descriptionKey: "settingsNotifications.approvalRequiredDesc",
    email: true,
    slack: true,
  },
  {
    key: "approved",
    labelKey: "settingsNotifications.approved",
    descriptionKey: "settingsNotifications.approvedDesc",
    email: true,
    slack: true,
  },
  {
    key: "sentForRevision",
    labelKey: "settingsNotifications.sentForRevision",
    descriptionKey: "settingsNotifications.sentForRevisionDesc",
    email: true,
    slack: true,
  },
  {
    key: "rejected",
    labelKey: "settingsNotifications.rejected",
    descriptionKey: "settingsNotifications.rejectedDesc",
    email: true,
    slack: true,
  },
  {
    key: "escalation",
    labelKey: "settingsNotifications.escalation",
    descriptionKey: "settingsNotifications.escalationDesc",
    email: true,
    slack: true,
  },
];

export default function NotificationsSettingsPage() {
  const { t } = useLanguage();

  const [channels, setChannels] = useState<DeliveryChannels>({
    emailNotifications: true,
    slackDm: true,
  });

  const [events, setEvents] =
    useState<NotificationEventConfig[]>(DEFAULT_EVENTS);

  const [reminders, setReminders] = useState<ReminderSettings>({
    reminder24h: true,
    reminder72h: true,
    autoEscalation: true,
  });

  const handleChannelToggle = (key: keyof DeliveryChannels) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEventToggle = (eventKey: string, channel: "email" | "slack") => {
    setEvents((prev) =>
      prev.map((e) =>
        e.key === eventKey ? { ...e, [channel]: !e[channel] } : e
      )
    );
  };

  const handleReminderToggle = (key: keyof ReminderSettings) => {
    setReminders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SettingsSidebar activeItem="notifications">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("settingsNotifications.title")}
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t("settingsNotifications.subtitle")}
          </p>
        </div>
        <DeliveryChannelsCard
          channels={channels}
          onToggle={handleChannelToggle}
        />
        <NotificationEventsCard
          events={events}
          onToggle={handleEventToggle}
        />
        <RemindersEscalationCard
          reminders={reminders}
          onToggle={handleReminderToggle}
        />
      </div>
    </SettingsSidebar>
  );
}
