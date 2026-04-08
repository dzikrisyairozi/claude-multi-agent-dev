# TASK B — マルチテナント提案書 / Multi-Tenant Architecture Proposal

**Priority**: Medium
**Assignee**: Miftah
**Effort**: M (Medium) — Research + document writing
**Status**: Proposal document only — no implementation

---

## Current State

- Single-tenant architecture — all users share the same data space
- 5 roles defined in `src/types/user.ts`: `approver`, `requester`, `accounting`, `admin`, `platform_admin`
- Platform Admin role exists but only manages system-level config (users, permissions)
- RLS policies are user-scoped (via `auth.uid()`), not tenant-scoped
- No `tenant_id` or `organization_id` on any table

## Scope

Produce a **proposal document** (no code). This is an architecture decision record (ADR) for the team to review before implementation in April.

## Deliverable Structure

The proposal should cover these sections:

### 1. Tenant Isolation Strategy
Compare approaches and recommend one:
- **Option A**: `tenant_id` column on every table (row-level isolation)
- **Option B**: Schema-per-tenant (Postgres schemas)
- **Option C**: Database-per-tenant (separate Supabase projects)
- Recommend Option A for simplicity + Supabase compatibility

### 2. Role Hierarchy
- Platform Admin → creates tenants (organizations/companies), creates Admin users, assigns Admins to tenants
- Admin → manages users within their tenant
- Other roles → scoped to their tenant
- Cross-tenant visibility: Platform Admin only

### 3. Middleware/Auth Approach
- How to extract tenant context: JWT custom claim vs subdomain vs header
- Next.js middleware (`middleware.ts`) for tenant resolution
- Supabase RLS policy changes for `tenant_id` filtering

### 4. Database Changes
Which tables need `tenant_id`:
- `profiles`, `approval_requests`, `approval_routes`, `approval_route_steps`
- `departments`, `positions`, `documents`, `folders`
- `activity_logs`, `notifications`, `threads`, `messages`
- `role_permissions` (per-tenant permission customization?)
- `category_types` (if Task C is done by then)

### 5. Migration Strategy
- How to migrate existing data to a default tenant
- Backward compatibility during rollout
- Zero-downtime migration approach

### 6. Testing Strategy
- Data leakage test suite (User in Tenant A cannot see Tenant B data)
- RLS policy verification
- Cross-tenant admin operations

### 7. Scope Boundaries
- Phase 2 (April): Basic tenant isolation, Platform Admin CRUD
- Phase 3 (May+): Tenant-specific branding, SSO per tenant, billing

### 8. Risk Assessment
- Performance impact of `tenant_id` filtering on every query
- Complexity of RLS policy changes
- Migration rollback strategy

## Acceptance Criteria

- [ ] Proposal document produced with clear recommendation
- [ ] High-level technical architecture diagram
- [ ] Table-by-table `tenant_id` analysis
- [ ] Migration plan for existing single-tenant data
- [ ] Scope boundaries clearly defined (Phase 2 vs Phase 3)
- [ ] Risk assessment with mitigations
- [ ] Reviewed by Syahiid and Endo-san

## Technical Notes

- Platform Admin role already in `UserRole` type: `src/types/user.ts`
- Current RLS policies in `supabase/migrations/` — audit needed
- Supabase supports `set_config('app.tenant_id', ...)` for RLS context
- JWT custom claims can be set via Supabase hooks
- Timeline: Implementation in April, parallel with Slack/email notifications

## Dependencies

- None — independent research task
- Output informs all future multi-tenant development
