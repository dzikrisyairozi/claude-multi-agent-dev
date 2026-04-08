-- Add step_order to notifications for step-scoped completion
-- Allows completeNotificationAction to clear only the current step's notifications
ALTER TABLE notifications ADD COLUMN step_order integer;
