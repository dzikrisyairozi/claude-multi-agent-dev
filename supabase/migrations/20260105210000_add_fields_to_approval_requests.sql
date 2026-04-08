-- Migration to add extra fields to approval_requests table
-- Using DO blocks to safely add columns only if they don't exist

DO $$ 
BEGIN
    -- Add department column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'department') THEN
        ALTER TABLE public.approval_requests ADD COLUMN department TEXT;
    END IF;

    -- Add is_use_tax column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'is_use_tax') THEN
        ALTER TABLE public.approval_requests ADD COLUMN is_use_tax BOOLEAN;
    END IF;

    -- Add is_tax_included column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'is_tax_included') THEN
        ALTER TABLE public.approval_requests ADD COLUMN is_tax_included BOOLEAN;
    END IF;

    -- Add tax_rate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'tax_rate') THEN
        ALTER TABLE public.approval_requests ADD COLUMN tax_rate NUMERIC;
    END IF;

    -- Add payment_schedule_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'payment_schedule_date') THEN
        ALTER TABLE public.approval_requests ADD COLUMN payment_schedule_date DATE;
    END IF;

    -- Add payment_method column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'payment_method') THEN
        ALTER TABLE public.approval_requests ADD COLUMN payment_method TEXT;
    END IF;

    -- Add reason_for_purchase column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'reason_for_purchase') THEN
        ALTER TABLE public.approval_requests ADD COLUMN reason_for_purchase TEXT;
    END IF;

    -- Add purpose column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'purpose') THEN
        ALTER TABLE public.approval_requests ADD COLUMN purpose TEXT;
    END IF;

    -- Add remarks column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'approval_requests' 
                   AND column_name = 'remarks') THEN
        ALTER TABLE public.approval_requests ADD COLUMN remarks TEXT;
    END IF;
END $$;
