# Multi-Tenant Admin Architecture Plan

## Context

The EB-FILEMG project is currently single-tenant — all users share a global namespace with user-level data isolation via RLS (`user_id = auth.uid()`). There is no concept of organization, team, or workspace. The goal is to introduce multi-tenant architecture where:

- Users can belong to **multiple organizations** with different roles per org
- Data (documents, folders, approval requests, routes, activity logs, AI threads, notifications, departments, positions, permissions) is **strictly isolated per organization**
- A **two-tier role model**: platform admins (manage all orgs) + org-scoped roles (admin, approver, requester, accounting)
- URLs include org slug: `/[slug]/files`, `/[slug]/admin/users`
- Existing data migrates to a default organization

---

## Current System State (as of 2026-03-29)

### Role System
The current role enum has 5 values (migrated from old names):
- `platform_admin` (was `superadmin`) — global admin
- `admin` (was `manager`) — org-level admin
- `approver` (new) — approval workflow role
- `requester` (was `employee`) — submits requests
- `accounting` (was `accountant`) — finance role

### Features Already Built
These features exist in the current single-tenant system and must be scoped per-org:

1. **Permission Matrix** — 26 configurable permission actions across 5 categories (submission, approval, route_config, reports, system), stored in `permissions` + `role_permissions` tables, with values: `granted`, `denied`, `assigned_only`, `limited`, `view_only`
2. **Departments** — `departments` table with name, description, is_active. 10 seeded departments. Linked to profiles via `department_id`.
3. **Positions** — `positions` table with name, level (1-9 hierarchy), description, is_active. 9 seeded positions. Linked to profiles via `position_id`.
4. **Notifications** — `notifications` table with real-time Supabase support. Types: `approval_submitted`, `approval_approved`, `approval_rejected`, `approval_need_revision`.
5. **Enhanced Approval Routes** — Multi-step with conditional routing by amount/department/category. Steps support `approver_position_id` and `approver_department_id`. Snapshot table `approval_request_step_approvals` captures route state at submission time.
6. **Enhanced Approval Requests** — Tax fields (`is_use_tax`, `is_tax_included`, `tax_rate`), payment fields (`payment_method`, `payment_schedule_date`), `department`, `purpose`, `reason_for_purchase`, `remarks`, `route_id`, `current_step_order`.
7. **Authorization Service** — `src/service/auth/authorization.ts` with `getCurrentUserProfile()`, `isAdminOrSuper()`, `hasRole()`, `checkPermission()` (uses `check_user_permission` RPC).
8. **Activity Logging** — Expanded with entity types: `department`, `position`, `permission`, and actions for all CRUD on these entities.

### Current Admin Routes
```
/admin/dashboard/
/admin/users/
/admin/approval-routes/
/admin/departments/
/admin/positions/
/admin/permissions/
```

---

## Architecture Decisions

### 1. Membership Model: Join Table (`organization_members`)
Since users can belong to multiple orgs, `org_id` does NOT live on `profiles`. Instead, a separate `organization_members` table maps users to orgs with per-org roles. The "active org" is determined by the URL slug (`/[slug]/...`).

### 2. Tenant Identification: URL Slug + RLS Helper
- URL param `[slug]` → resolve to `org_id` via lookup
- PostgreSQL helper `get_org_id_by_slug()` and session-based `set_config('app.current_org_id', ...)` for RLS
- Server actions receive `orgSlug` param, resolve to `org_id`, set session config before queries

### 3. Two-Tier Role Model
- **`platform_role`** on `profiles`: enum `'admin' | 'user'`, default `'user'`. Platform admins (`'admin'`) can manage all organizations.
- **`role`** on `organization_members`: `'admin' | 'approver' | 'requester' | 'accounting'`. Scoped per org.
- Current `platform_admin` users → `platform_role = 'admin'` + org role `'admin'` in default org
- Current `admin` users → `platform_role = 'user'` + org role `'admin'` in default org
- Current `approver/requester/accounting` users → same role in default org

### 4. S3 Storage: Org-Prefixed Paths
New uploads: `uploads/{org_id}/{user_id}/{uuid}_{filename}`. Existing files keep their current paths.

### 5. Auto-Set `org_id` Trigger
A PostgreSQL trigger on all data tables auto-sets `org_id` from `current_setting('app.current_org_id')` on INSERT, so client-side code doesn't need to pass it explicitly.

### 6. Org-Scoped Permission Matrix
The `role_permissions` table gets `org_id` — each organization can customize its own permission matrix independently. Default permissions are seeded when creating a new org (copied from the global defaults).

### 7. Org-Scoped Departments & Positions
Departments and positions are per-organization. Each org manages its own department/position lists. Default departments and positions are seeded when creating a new org.

---

## Phase 1: Database Schema Foundation

### Migration 1: Create `organizations` table

**File:** `supabase/migrations/YYYYMMDD000001_create_organizations.sql`

```sql
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Everyone can read orgs they are a member of (policy added after org_members table)
-- Platform admins can read all orgs
```

### Migration 2: Create `organization_members` table

**File:** `supabase/migrations/YYYYMMDD000002_create_organization_members.sql`

```sql
CREATE TYPE public.org_role AS ENUM ('admin', 'approver', 'requester', 'accounting');

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'requester',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON public.organization_members(org_id);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
```

### Migration 3: Add `platform_role` to profiles

**File:** `supabase/migrations/YYYYMMDD000003_add_platform_role.sql`

```sql
CREATE TYPE public.platform_role AS ENUM ('admin', 'user');

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_role public.platform_role NOT NULL DEFAULT 'user';
```

### Migration 4: Add `org_id` to all data tables

**File:** `supabase/migrations/YYYYMMDD000004_add_org_id_to_tables.sql`

Tables receiving `org_id uuid REFERENCES organizations(id)`:
- `documents`
- `folders`
- `document_embeddings`
- `ai_threads`
- `ai_messages`
- `approval_requests`
- `approval_routes`
- `approval_route_steps`
- `approval_request_step_approvals`
- `approval_request_documents`
- `submission_embeddings`
- `activity_logs`
- `departments`
- `positions`
- `permissions` (read-only seed data — shared globally, no `org_id` needed)
- `role_permissions`
- `notifications`

> **Note:** The `permissions` table contains the 26 action definitions and is read-only reference data — it does NOT need `org_id`. Only `role_permissions` (the configurable matrix) needs `org_id` so each org can have its own permission configuration.

Each gets: `ALTER TABLE ... ADD COLUMN org_id uuid REFERENCES organizations(id);` + index.

### Migration 5: Seed default org + backfill data

**File:** `supabase/migrations/YYYYMMDD000005_seed_default_org_backfill.sql`

1. Insert default organization (fixed UUID)
2. Create `organization_members` entries for all existing profiles:
   - `platform_admin` → `platform_role = 'admin'` on profile + org member `role = 'admin'`
   - `admin` → `platform_role = 'user'` on profile + org member `role = 'admin'`
   - `approver` → org member `role = 'approver'`
   - `requester` → org member `role = 'requester'`
   - `accounting` → org member `role = 'accounting'`
3. Backfill `org_id` on all data tables to default org UUID
4. Copy existing `role_permissions` rows with default org UUID
5. Make `org_id` NOT NULL on all data tables (except `permissions`)

### Migration 6: Helper functions

**File:** `supabase/migrations/YYYYMMDD000006_helper_functions.sql`

All helper functions read from **session variables only** (zero table queries, best performance):

```sql
-- Get current org_id from session (set by getSessionContext)
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid;
$$;

-- Check if user is platform admin (reads session var, no table query)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.platform_role', true) = 'admin';
$$;

-- Get user's role in current org (reads session var, no table query)
CREATE OR REPLACE FUNCTION public.current_org_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_org_role', true);
$$;

-- Check if user is admin of current org
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_org_role', true) = 'admin';
$$;
```

**All session variables are set by `getSessionContext()` at the start of every server action:**
- `app.current_org_id` — the resolved org UUID
- `app.platform_role` — `'admin'` or `'user'`
- `app.current_org_role` — `'admin'`, `'approver'`, `'requester'`, or `'accounting'`

### Migration 7: Auto-set `org_id` trigger

**File:** `supabase/migrations/YYYYMMDD000007_auto_set_org_id_trigger.sql`

```sql
CREATE OR REPLACE FUNCTION public.set_org_id_from_session()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := current_org_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to all data tables
CREATE TRIGGER set_org_id_documents BEFORE INSERT ON documents FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_folders BEFORE INSERT ON folders FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_approval_requests BEFORE INSERT ON approval_requests FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_approval_routes BEFORE INSERT ON approval_routes FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_approval_route_steps BEFORE INSERT ON approval_route_steps FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_approval_request_step_approvals BEFORE INSERT ON approval_request_step_approvals FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_approval_request_documents BEFORE INSERT ON approval_request_documents FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_activity_logs BEFORE INSERT ON activity_logs FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_departments BEFORE INSERT ON departments FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_positions BEFORE INSERT ON positions FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_role_permissions BEFORE INSERT ON role_permissions FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_notifications BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_ai_threads BEFORE INSERT ON ai_threads FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_ai_messages BEFORE INSERT ON ai_messages FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_document_embeddings BEFORE INSERT ON document_embeddings FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
CREATE TRIGGER set_org_id_submission_embeddings BEFORE INSERT ON submission_embeddings FOR EACH ROW EXECUTE FUNCTION set_org_id_from_session();
```

### Migration 8: Rewrite ALL RLS policies

**File:** `supabase/migrations/YYYYMMDD000008_rewrite_rls_policies.sql`

Core pattern changes from `user_id = auth.uid()` to:
```sql
org_id = current_org_id() AND user_id = auth.uid()
-- OR for role-based (all session var reads, no table queries):
org_id = current_org_id() AND (user_id = auth.uid() OR current_org_role() IN ('admin'))
-- OR for platform admin:
is_platform_admin()
```

**Key policies to rewrite:**
- `profiles` SELECT: keep public viewable (within org context or platform admin)
- `documents` CRUD: `org_id = current_org_id() AND user_id = auth.uid()`
- `folders` CRUD: same pattern
- `approval_requests` SELECT: org members can see, filtered by role and permission
- `approval_routes`: org admins can manage, all org members can view active
- `activity_logs`: org-scoped, admin can see all within org
- `organization_members`: users can see members in their orgs, org admins can manage
- `organizations`: members can view their orgs, platform admins can manage all
- `departments`: org-scoped, org admins can manage, all org members can view
- `positions`: org-scoped, org admins can manage, all org members can view
- `role_permissions`: org-scoped, org admins can manage, all org members can view
- `notifications`: org-scoped, recipients can view their own

### Migration 9: Update embedding functions

**File:** `supabase/migrations/YYYYMMDD000009_update_embedding_functions.sql`

Add `p_org_id uuid` parameter to:
- `match_document_embeddings` → filter `WHERE de.org_id = p_org_id`
- `match_document_embeddings_v2` / `v3` → same
- `match_submission_embeddings` → same
- `hybrid_search_bm25` (all versions) → filter by `org_id`

### Migration 10: Update `handle_new_user` trigger

**File:** `supabase/migrations/YYYYMMDD000010_update_handle_new_user.sql`

Read `org_id` from `raw_user_meta_data` and create `organization_members` entry:
```sql
-- After creating profile, also create org membership if org_id provided in metadata
INSERT INTO organization_members (org_id, user_id, role)
VALUES (
  (new.raw_user_meta_data->>'org_id')::uuid,
  new.id,
  coalesce((new.raw_user_meta_data->>'role')::org_role, 'requester')
);
```

### Migration 11: Update `check_user_permission` RPC

**File:** `supabase/migrations/YYYYMMDD000011_update_check_permission_rpc.sql`

Update the `check_user_permission` function to be org-scoped:
```sql
-- Must filter role_permissions by org_id = current_org_id()
-- Must resolve user's role from organization_members (not profiles.role)
-- Falls back to 'denied' if no org-scoped permission found
```

---

## Phase 2: Types & Shared Utilities

### New type file: `src/types/organization.ts`

```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrgRole = "admin" | "approver" | "requester" | "accounting";

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  organization?: Organization;
}
```

### Update `src/types/user.ts`

- Keep `UserRole` for backward compat but add `OrgRole` import
- Add `platform_role: 'admin' | 'user'` to `Profile`
- Add `org_id` to `CreateUserParams` (for inviting into an org)

### Update `src/types/permission.ts`

- Add `org_id: string` to `RolePermission` interface
- Update `UpdateRolePermissionParams` to include `orgSlug`

### Update `src/types/department.ts` & `src/types/position.ts`

- Add `org_id: string` to `Department` and `Position` interfaces

### Update `src/types/notification.ts`

- Add `org_id: string` to `Notification` interface

### New helper: `src/service/auth/getSessionContext.ts`

```typescript
"use server";
// Resolves org from slug, sets ALL session variables, returns context
export async function getSessionContext(orgSlug: string) {
  const supabase = await supabaseServer();
  // 1. Auth check — get current user
  // 2. Fetch profile (for platform_role)
  // 3. Resolve slug → org_id from organizations table
  // 4. Fetch membership (org_members where user_id + org_id) → get org role
  // 5. Set ALL session variables in one call:
  //    await supabase.rpc('set_config', { key: 'app.current_org_id', value: orgId })
  //    await supabase.rpc('set_config', { key: 'app.platform_role', value: profile.platform_role })
  //    await supabase.rpc('set_config', { key: 'app.current_org_role', value: membership.role })
  // 6. Return { supabase, user, profile, orgId, orgSlug, orgRole, isPlatformAdmin }
}
```

**Critical:** Every server action that touches org-scoped data must call `getSessionContext(orgSlug)` first. This sets **3 PostgreSQL session variables** that RLS policies, helper functions, and auto-set triggers all depend on:
- `app.current_org_id` — for data isolation
- `app.platform_role` — for `is_platform_admin()` checks
- `app.current_org_role` — for `is_org_admin()` / `current_org_role()` checks

Since all RLS functions read session variables (not tables), there is **zero additional query overhead** per row evaluation.

### New service: `src/service/organization/organization.ts`

CRUD for organizations (platform admin only):
- `getOrganizations()` — list all orgs
- `createOrganization(name, slug)` — create new org + seed default departments, positions, role_permissions
- `updateOrganization(id, ...)` — update org settings
- `getOrganizationMembers(orgSlug)` — list members of an org
- `inviteMemberToOrg(orgSlug, email, role)` — invite user to org
- `updateMemberRole(orgSlug, userId, role)` — change member's role
- `removeMember(orgSlug, userId)` — remove from org

---

## Phase 3: Service Layer Updates

### Pattern change for ALL server actions

Every server action that touches org-scoped data needs:
1. Accept `orgSlug: string` as first parameter
2. Call `getSessionContext(orgSlug)` to authenticate + set org context
3. Authorization checks use `orgRole` from context + `checkPermission()` (org-scoped) instead of `isAdminOrSuper()`

### Update `src/service/auth/authorization.ts`

The authorization service must become org-aware:
- `getCurrentUserProfile()` → reads `platform_role` from profile, `org_role` from membership
- `isAdminOrSuper()` → replaced by `isOrgAdmin()` (checks org membership role) and `isPlatformAdmin()` (checks `platform_role`)
- `hasRole()` → checks role from `organization_members` for current org, not `profiles.role`
- `checkPermission(action)` → `check_user_permission` RPC must filter `role_permissions` by `org_id = current_org_id()` and resolve role from membership

### Files to modify:

| File | Changes |
|------|---------|
| `src/service/auth/authorization.ts` | Org-aware role checks. `checkPermission()` uses org-scoped `role_permissions`. Replace `isAdminOrSuper()` with `isOrgAdmin()` / `isPlatformAdmin()`. |
| `src/service/admin/user.ts` | Replace `isAdminOrSuper()` with `getSessionContext()`. `getUsers()` returns org members. `inviteUser()` passes org_id in metadata. All functions take `orgSlug` param. |
| `src/service/admin/permission.ts` | Add `orgSlug` param. Permission matrix CRUD scoped to org via `org_id` on `role_permissions`. |
| `src/service/admin/department.ts` | Add `orgSlug` param. Departments scoped per org. |
| `src/service/admin/position.ts` | Add `orgSlug` param. Positions scoped per org. |
| `src/service/approvalRequest/approvalRequest.ts` | Add `orgSlug` param to all exports. Use `getSessionContext()`. `org_id` auto-set by trigger on insert. |
| `src/service/approvalRequest/approvalRouteMatching.ts` | Add `orgSlug` param. Route matching already scoped by RLS after session config is set. |
| `src/service/approvalRoute/approvalRoute.ts` | Replace `isAdminOrSuper()` with org admin check. Add `orgSlug` param. |
| `src/service/activityLog/activityLog.ts` | `logActivity()` needs `org_id` in payload (from context). Query functions take `orgSlug`. |
| `src/service/notification/notification.ts` | Add `orgSlug` param. Notifications scoped per org. |
| `src/service/document/document.ts` | Add `orgSlug` param. Documents scoped by RLS. |
| `src/service/folder/folder.ts` | Add `orgSlug` param. |
| `src/service/thread/thread.ts` | Add `orgSlug` param. |
| `src/service/message/message.ts` | Add `orgSlug` param. |
| `src/service/user.ts` | `getCurrentUser()` returns `platform_role` and list of org memberships. |
| `src/service/rag/submissionEmbeddings.ts` | Pass `org_id` to embedding RPC calls. |
| `src/service/s3/uploadFile.ts` | S3 key becomes `uploads/{org_id}/{user_id}/...`. |
| `src/app/api/upload/route.ts` | Resolve org context, set org_id on document insert, update S3 path. |
| `src/app/api/openai/respond/route.ts` | Pass org context to RAG tools. Embedding search scoped by org_id. |
| `src/app/api/folders/*/route.ts` | Add org context resolution. |
| `src/app/api/files/*/route.ts` | Add org context resolution. |

---

## Phase 4: Routing & Layout Changes

### New URL structure

```
/                                    → Org selector / redirect to last org
/[slug]/                             → Dashboard (approval requests)
/[slug]/files                        → File management
/[slug]/c                            → AI chat
/[slug]/c/[threadId]                 → Chat thread
/[slug]/approval-requests/[id]       → Approval detail
/[slug]/activity-log                 → Activity log
/[slug]/admin/                       → Org admin dashboard
/[slug]/admin/users                  → Org user management
/[slug]/admin/approval-routes        → Org approval routes
/[slug]/admin/departments            → Org department management
/[slug]/admin/positions              → Org position management
/[slug]/admin/permissions            → Org permission matrix
/platform-admin/                     → Platform admin dashboard
/platform-admin/organizations        → Manage all orgs
/platform-admin/organizations/[id]   → Org detail
/login                               → Login (stays)
/inactive                            → Inactive (stays)
```

### File structure changes

```
src/app/
├── (auth)/                          # Keep: login, inactive, callback
├── [slug]/
│   ├── layout.tsx                   # NEW: Org context provider, membership check
│   ├── page.tsx                     # MOVE from src/app/(main)/page.tsx
│   ├── files/page.tsx               # MOVE from src/app/files/
│   ├── c/                           # MOVE from src/app/c/
│   ├── approval-requests/           # MOVE from src/app/approval-requests/
│   ├── activity-log/                # MOVE from src/app/activity-log/
│   └── admin/                       # MOVE from src/app/admin/
│       ├── layout.tsx               # Check org admin role
│       ├── dashboard/page.tsx
│       ├── users/page.tsx
│       ├── approval-routes/page.tsx
│       ├── departments/page.tsx     # MOVE from src/app/admin/departments/
│       ├── positions/page.tsx       # MOVE from src/app/admin/positions/
│       └── permissions/page.tsx     # MOVE from src/app/admin/permissions/
├── platform-admin/                  # NEW
│   ├── layout.tsx                   # Check platform_admin role
│   ├── page.tsx                     # Dashboard
│   └── organizations/
│       ├── page.tsx                 # List/create orgs
│       └── [id]/page.tsx            # Org detail + members
├── dev-tools/                       # KEEP (gated by env var)
└── page.tsx                         # NEW: Org selector / redirect
```

> **Note:** Since `[slug]` is a top-level dynamic segment, we need to ensure it doesn't conflict with static routes like `/login`, `/inactive`, `/platform-admin`, `/dev-tools`, and `/auth`. Next.js resolves static routes before dynamic ones, so this works correctly. The `[slug]/layout.tsx` must validate the slug against actual org slugs and return 404 for invalid ones.

### New layout: `src/app/[slug]/layout.tsx`

- Resolve `slug` param → verify org exists and user is member
- Provide org context via React context (OrgProvider)
- Pass `orgSlug` down to components

### New provider: `src/providers/OrgProvider.tsx`

```typescript
// Provides { org, orgSlug, membership, orgRole } to all child components
// Used by hooks and components to access current org context
// Fetches membership with staleTime + refetchOnWindowFocus for freshness
```

**Stale role protection:** If a platform admin changes a user's org role while the user is logged in:
- **Server side**: Always safe — `getSessionContext()` reads fresh role from DB on every request, RLS blocks unauthorized actions
- **Client side UI**: Use TanStack Query with `staleTime: 60_000` and `refetchOnWindowFocus: true` on the org membership query, so the UI auto-corrects within ~1 minute or when user tabs back
- **Worst case**: User sees a stale admin button, clicks it, server returns "Unauthorized"

### Org Selector Page: `src/app/page.tsx`

- If user has one org → redirect to `/[slug]/`
- If user has multiple orgs → show org picker grid
- If platform admin → also show link to `/platform-admin/`

---

## Phase 5: Auth Context & Hooks Updates

### Update `src/hooks/useAuth.tsx`

- Fetch profile with `platform_role`
- Expose `isPlatformAdmin` boolean (`platform_role === 'admin'`)
- Fetch user's org memberships list for org selector
- Add `orgMemberships: OrganizationMember[]` to context

### New hook: `src/hooks/useOrg.ts`

```typescript
// Reads from OrgProvider context
// Returns { org, orgSlug, orgRole, isOrgAdmin }
// Used by components to conditionally render admin features
```

### Update all TanStack Query hooks

Every hook that fetches org-scoped data needs `orgSlug` in its query key and passes it to server actions:
- `useFolderContentsQuery(orgSlug, folderId)`
- `useThreadsQuery(orgSlug)`
- `useActivityLogsQuery(orgSlug, filters)`
- `useCancelApprovalRequestMutation(orgSlug)`
- `useNotifications(orgSlug)` — notifications scoped to org
- `useDepartmentsQuery(orgSlug)` — departments scoped to org
- `usePositionsQuery(orgSlug)` — positions scoped to org
- `usePermissionMatrixQuery(orgSlug)` — permissions scoped to org
- etc.

### Update `src/app/admin/layout.tsx` → `src/app/[slug]/admin/layout.tsx`

Check `orgRole === 'admin'` instead of `role === 'admin' || role === 'platform_admin'`.

---

## Phase 6: Platform Admin UI

### New pages

1. **`/platform-admin/page.tsx`** — Dashboard with org count, user count, quick links
2. **`/platform-admin/organizations/page.tsx`** — Table of all orgs with name, slug, member count, status. Create org dialog.
3. **`/platform-admin/organizations/[id]/page.tsx`** — Org detail: edit name/settings, list members, add/remove members, toggle org active status.

### New components

- `CreateOrganizationDialog` — Form: name, slug (auto-generated from name)
- `OrganizationTable` — List with search, pagination
- `OrgMembersTable` — Members list with role editing

---

## Phase 7: Org Admin UI Adjustments

### `/[slug]/admin/users/page.tsx`

- Same UI as current `/admin/users/` but scoped to org via RLS
- Invite dialog passes `orgSlug` to `inviteMemberToOrg()`
- Role dropdown shows org roles: admin, approver, requester, accounting (no platform_admin)
- Can only manage members of current org

### `/[slug]/admin/approval-routes/page.tsx`

- Same as current but scoped to org
- Routes created within org context

### `/[slug]/admin/departments/page.tsx`

- Same as current but scoped to org
- Each org manages its own department list

### `/[slug]/admin/positions/page.tsx`

- Same as current but scoped to org
- Each org manages its own position hierarchy

### `/[slug]/admin/permissions/page.tsx`

- Same permission matrix UI but scoped to org
- Each org can customize its own role-permission mapping
- `role_permissions` filtered by `org_id`

---

## Phase 8: Navigation & UI Polish

### Update `MainLayout` / sidebar navigation

- Show current org name in sidebar header
- Add org switcher dropdown (if user has multiple orgs)
- Update nav links to include `/[slug]/` prefix
- Show "Platform Admin" link if `isPlatformAdmin`
- Show "Org Admin" section if `orgRole === 'admin'`

### Update all internal links/redirects

Every `router.push()`, `<Link>`, and redirect must include org slug prefix. Search for all `router.push` and `href` across the codebase.

---

## Implementation Order (Recommended)

| Step | Phase | Effort | Risk | Notes |
|------|-------|--------|------|-------|
| 1 | Phase 1: Migrations 1-5 | Medium | Low | Safe, additive schema changes |
| 2 | Phase 1: Migrations 6-7 | Medium | Low | Helper functions and triggers |
| 3 | Phase 2: Types + getSessionContext | Small | Low | Foundation for all service changes |
| 4 | Phase 2: Organization service | Medium | Low | New CRUD, no breaking changes |
| 5 | Phase 4: Route restructure | Large | Medium | Move files, update imports |
| 6 | Phase 5: Auth + OrgProvider | Medium | Medium | Core context changes |
| 7 | Phase 3: Service layer updates | Large | **High** | Every server action changes |
| 8 | Phase 1: Migration 8 (RLS rewrite) | Large | **High** | Must deploy with step 7 |
| 9 | Phase 1: Migrations 9-11 | Small | Low | Embedding + trigger + permission RPC updates |
| 10 | Phase 6: Platform admin UI | Medium | Low | New pages, no breaking changes |
| 11 | Phase 7: Org admin adjustments | Medium | Low | Adapt existing UI |
| 12 | Phase 8: Nav + polish | Medium | Low | Links, switcher, redirects |

**Steps 7 + 8 are the big bang** — RLS policy rewrite and service layer changes must deploy together. Everything else is incremental.

---

## Verification Plan

1. **Migration testing**: Run `supabase db reset` locally, verify all migrations apply cleanly
2. **RLS testing**: Write SQL tests that verify:
   - User A in Org 1 cannot see Org 2's data
   - Org admin can manage members within their org
   - Platform admin can see all orgs
   - Auto-set trigger correctly populates `org_id`
   - Org-scoped permission checks work (user in Org 1 with `granted` on action X, same role in Org 2 with `denied`)
3. **Service testing**: Test each server action with org context:
   - Create document in Org 1, verify not visible from Org 2
   - Submit approval request, verify route matching scoped to org
   - Invite user to org, verify membership created
   - Modify permission matrix in Org 1, verify Org 2 unaffected
   - Create department in Org 1, verify not visible from Org 2
4. **E2E testing**:
   - Login → org selector → navigate to org → create files/approvals
   - Switch orgs → verify data isolation
   - Platform admin → create org → invite member → member can access
   - Org admin → manage departments/positions/permissions within org
5. **Build verification**: `npm run build` + `npm run typecheck` must pass

---

## Critical Files Summary

**New files:**
- `supabase/migrations/` — 11 new migration files
- `src/types/organization.ts`
- `src/service/auth/getSessionContext.ts`
- `src/service/organization/organization.ts`
- `src/app/[slug]/layout.tsx`
- `src/app/platform-admin/` — new pages
- `src/providers/OrgProvider.tsx`
- `src/hooks/useOrg.ts`

**Files requiring significant modification:**
- `src/types/user.ts` — add `platform_role`
- `src/types/permission.ts` — add `org_id` to `RolePermission`
- `src/types/department.ts` — add `org_id`
- `src/types/position.ts` — add `org_id`
- `src/types/notification.ts` — add `org_id`
- `src/hooks/useAuth.tsx` — expose org memberships, platform role
- `src/service/auth/authorization.ts` — org-aware role checks, org-scoped `checkPermission()`
- `src/service/admin/user.ts` — org-scoped user management
- `src/service/admin/permission.ts` — org-scoped permission matrix
- `src/service/admin/department.ts` — org-scoped departments
- `src/service/admin/position.ts` — org-scoped positions
- `src/service/notification/notification.ts` — org-scoped notifications
- `src/service/approvalRequest/approvalRequest.ts` — add org context
- `src/service/approvalRoute/approvalRoute.ts` — org-scoped routes
- `src/service/activityLog/activityLog.ts` — org-scoped logging
- `src/app/api/upload/route.ts` — org-scoped uploads + S3 path
- All TanStack Query hooks in `src/hooks/`
- All page components under `src/app/` (move to `/[slug]/` structure)
- `src/components/layout/MainLayout.tsx` — org switcher, nav links

**Existing patterns to reuse:**
- `isAdminOrSuper()` pattern in [authorization.ts](src/service/auth/authorization.ts) → becomes `isOrgAdmin()` / `isPlatformAdmin()`
- `checkPermission()` in [authorization.ts](src/service/auth/authorization.ts) → update RPC to be org-scoped
- `handle_new_user()` trigger → extend with org membership
- `logActivity()` pattern in [activityLog.ts](src/service/activityLog/activityLog.ts) → add org_id field
- Admin layout role check in [layout.tsx](src/app/admin/layout.tsx) → adapt for org admin check
