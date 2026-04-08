-- Add approval_notes column to approval_requests table
ALTER TABLE approval_requests
ADD COLUMN approval_notes TEXT;
