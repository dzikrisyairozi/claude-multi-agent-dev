export const WEBHOOK_DEV = "webhook-test";
export const WEBHOOK_PROD = "webhook";

export const getWebhookN8NUrl =
  process.env.NEXT_PUBLIC_ENVIRONMENT === "development"
    ? WEBHOOK_DEV
    : WEBHOOK_PROD;
