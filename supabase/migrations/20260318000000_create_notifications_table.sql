-- Create notifications table for in-app approval notifications
CREATE TABLE notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  approval_request_id uuid REFERENCES approval_requests(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Authenticated server actions can insert notifications for any recipient
CREATE POLICY "auth_insert" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can only see their own notifications
CREATE POLICY "own_select" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "own_update" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Indexes for fast lookups
CREATE INDEX notifications_recipient_created_at ON notifications (recipient_id, created_at DESC);
CREATE INDEX notifications_recipient_unread ON notifications (recipient_id, is_read) WHERE NOT is_read;

-- Enable Supabase Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
