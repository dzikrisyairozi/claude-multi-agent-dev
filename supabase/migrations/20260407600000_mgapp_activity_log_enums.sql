-- Add knowledge_entry activity log enum values
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'knowledge_entry_create';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'knowledge_entry_update';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'knowledge_entry_delete';

ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'knowledge_entry';
