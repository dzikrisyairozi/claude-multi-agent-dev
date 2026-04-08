-- Notification Revamp: add "Needs Action" concept
-- requires_action tracks whether the notification requires a user response
-- action_completed_at is set when the user acts on the related item

ALTER TABLE notifications
  ADD COLUMN requires_action boolean DEFAULT false NOT NULL,
  ADD COLUMN action_completed_at timestamptz;

-- Partial index for fast "Needs Action" tab queries
CREATE INDEX notifications_needs_action
  ON notifications (recipient_id)
  WHERE requires_action = true AND action_completed_at IS NULL;

-- Required for Supabase Realtime UPDATE events to include full row
ALTER TABLE notifications REPLICA IDENTITY FULL;
