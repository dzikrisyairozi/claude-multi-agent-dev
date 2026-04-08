-- Migration: Extend activity_logs for user management and submission actions
-- Date: 2025-12-25

-- Add new activity actions
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_invite';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_approve';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_reject';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_role_change';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'user_delete';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'file_share';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'submission_approve';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'submission_reject';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'submission_need_revision';

-- Add new entity types
ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'user';
ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'submission';
