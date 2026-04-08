-- Migration E: Add position and department columns to approval route steps
-- Enables position-based and department+position routing

-- Add to route step definitions
ALTER TABLE public.approval_route_steps
  ADD COLUMN IF NOT EXISTS approver_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approver_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ars_approver_position ON public.approval_route_steps(approver_position_id);
CREATE INDEX IF NOT EXISTS idx_ars_approver_department ON public.approval_route_steps(approver_department_id);

-- Add to step approval snapshots (for historical records)
ALTER TABLE public.approval_request_step_approvals
  ADD COLUMN IF NOT EXISTS approver_position_id uuid,
  ADD COLUMN IF NOT EXISTS approver_department_id uuid;
