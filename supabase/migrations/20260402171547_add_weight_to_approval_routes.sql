-- Add weight column to approval_routes for tiebreaking when multiple routes match with equal specificity
ALTER TABLE public.approval_routes
  ADD COLUMN IF NOT EXISTS weight integer NOT NULL DEFAULT 50;

ALTER TABLE public.approval_routes
  ADD CONSTRAINT approval_routes_weight_range CHECK (weight BETWEEN 1 AND 100);
