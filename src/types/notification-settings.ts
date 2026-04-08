export interface DeliveryChannels {
  emailNotifications: boolean;
  slackDm: boolean;
}

export interface NotificationEventConfig {
  key: string;
  labelKey: string;
  descriptionKey: string;
  email: boolean;
  slack: boolean;
}

export interface ReminderSettings {
  reminder24h: boolean;
  reminder72h: boolean;
  autoEscalation: boolean;
}
