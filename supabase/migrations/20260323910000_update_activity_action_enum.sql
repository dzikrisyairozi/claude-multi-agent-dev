-- Migration F: Add new activity action values for departments, positions, and permissions

ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'department_create';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'department_update';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'department_delete';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'position_create';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'position_update';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'position_delete';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'permission_update';

-- Add new entity types
ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'department';
ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'position';
ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'permission';
