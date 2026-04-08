ALTER TABLE approval_requests
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN rejected_by UUID REFERENCES auth.users(id);
