# Multi-Tenant Architecture — Implementation Details

**Author:** Dzikri
**Date:** 2026-04-06
**Parent doc:** [`multi-tenant-architecture-proposal.md`](./multi-tenant-architecture-proposal.md) (high-level architecture)

This document contains all concrete SQL migrations, TypeScript code, RLS policies, triggers, and service-layer implementations referenced by the high-level proposal. Section numbers match the parent document for easy cross-referencing.

> **Decision pending (overview §6):** This document was written assuming **per-org permission matrix customization** (Option B). If Endo-san approves **Option A (global matrix)**, adjust: Migration 4 table list (remove `role_permissions`), Migration 11 `check_user_permission` RPC (remove `org_id` filter), §8 type updates (don't add `org_id` to `RolePermission`), §9.5 `seedOrgDefaults` (skip permission seeding).

---

## 4. Tenant-Context Propagation — Lint Enforcement

### ESLint rule `require-session-context`

- **Target:** any file with `"use server"` directive that calls `supabaseServer()` (directly or via a re-exporting helper in `@/integrations/supabase/*`).
- **Assertion:** every exported async function must have a call to `getSessionContext(...)` (or an allow-listed wrapper like `withPlatformAdminContext`, `withOrgScope`) that lexically precedes any `supabase.from(...)`, `.rpc(...)`, or `.storage.*` call in the same function body.
- **Transitive helpers:** a helper that itself calls `getSessionContext` and returns `{ supabase, orgId, ... }` is registered in `.eslintrc` under `sessionContextProviders: []`. The rule treats a destructure from such a helper as satisfying the assertion.
- **Exemptions:** files under `src/service/auth/`, `src/service/organization/bootstrap/`, and `*.test.ts` are exempt but must carry an `// eslint-disable-next-line require-session-context` comment with a justification string.
- **Failure mode:** CI-blocking. Rule ships with a unit-test corpus (valid + invalid fixtures) in `src/lib/eslint/require-session-context/__fixtures__/`.

**Why just one layer.** RLS already fails closed — a server action that forgets `getSessionContext` will simply return zero rows (or be rejected by `WITH CHECK`), not leak. The ESLint rule catches the ergonomic/developer-experience miss at CI time. A runtime Proxy wrapper over `supabaseServer()` was considered and rejected: it adds a maintenance surface (every Supabase SDK upgrade risks breaking the Proxy), requires a `supabaseServerRaw()` escape hatch for auth flows, and logs-and-drops in production rather than throwing — which is weaker than RLS.

---

## 5. Database Schema — Migration SQL

### Migration 1 — `organizations`

```sql
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  CONSTRAINT slug_not_reserved CHECK (slug NOT IN (
    'login','logout','signup','auth','callback','inactive',
    'platform-admin','admin','api','dev-tools','_next','static',
    'public','assets','favicon','robots','sitemap',
    'settings','profile','account','billing','help','support',
    'docs','home','www','app','new','create','invite','mail'
  ))
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
```

### Migration 2 — `organization_members`

```sql
CREATE TYPE public.org_role AS ENUM ('admin', 'approver', 'requester', 'accounting');

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'requester',
  is_active boolean NOT NULL DEFAULT true,
  -- Per-membership profile fields (was on profiles — must be per-org because
  -- departments/positions are org-scoped and a user may sit in different
  -- departments across orgs).
  first_name text,
  last_name text,
  department_id uuid,  -- FK added in Migration 4 after departments table gets org_id
  position_id uuid,    -- FK added in Migration 4 after positions table gets org_id
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org_id_role ON public.organization_members(org_id, role);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
```

> **Migration ordering note:** `department_id` and `position_id` FK constraints (`REFERENCES departments/positions`) cannot be added here because `departments` and `positions` don't have `org_id` yet (added in Migration 4). The columns are created as bare `uuid` in Migration 2, and FK constraints are added in a post-Migration-4 step:
>
> ```sql
> -- Run after Migration 4 (departments/positions now have org_id)
> ALTER TABLE organization_members
>   ADD CONSTRAINT fk_om_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
>   ADD CONSTRAINT fk_om_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;
> ```

### Migration 3 — `platform_role` on `profiles`

```sql
CREATE TYPE public.platform_role AS ENUM ('admin', 'user');
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS platform_role public.platform_role NOT NULL DEFAULT 'user';
```

### Migration 3b — Move profile fields onto `organization_members`

1. Backfills `organization_members.(first_name, last_name, department_id, position_id)` from each user's existing `profiles` row into their Default-Org membership.
2. Drops `department_id`, `position_id` from `profiles` (keeps `first_name`/`last_name` there as fallback display names for users with no active membership).
3. Updates the approval-route matcher (`approvalRouteMatching.ts`) to resolve approvers via `organization_members` rather than `profiles`.

### Migration 4 — `org_id` on all data tables

Add `org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT` to:

`documents`, `folders`, `document_embeddings`, `ai_threads`, `ai_messages`, `approval_requests`, `approval_routes`, `approval_route_steps`, `approval_request_step_approvals`, `approval_request_documents`, `submission_embeddings`, `activity_logs`, `departments`, `positions`, `role_permissions`, `notifications`, `category_types`.

**Not added to:** `permissions` (global read-only seed — 26 action definitions), `profiles` (users are multi-tenant via `organization_members`).

```sql
CREATE INDEX idx_documents_org_user ON documents(org_id, user_id);
CREATE INDEX idx_documents_org_created ON documents(org_id, created_at DESC);
CREATE INDEX idx_approval_requests_org_user ON approval_requests(org_id, user_id);
CREATE INDEX idx_approval_requests_org_status ON approval_requests(org_id, status);
CREATE INDEX idx_activity_logs_org_created ON activity_logs(org_id, created_at DESC);
CREATE INDEX idx_ai_threads_org_user ON ai_threads(org_id, user_id);
CREATE INDEX idx_document_embeddings_org ON document_embeddings(org_id);
-- ... one per table, matching the dominant query pattern
```

### Migration 5 — Seed default org + backfill

Steps (no SQL — this is a data migration):

1. Insert Default Organization (fixed UUID, recorded in migration for reproducibility).
2. For each existing profile, insert `organization_members` row with mapped org role.
3. Update profile `platform_role` for current `platform_admin` users.
4. Ensure every platform admin has at least one active `organization_members` row (seed into Default Org as `role = 'admin'` if missing).
5. Backfill `org_id = <default_uuid>` on all data tables.
6. Copy existing `role_permissions` rows into default org.
7. Set `profiles.settings.active_org_id = <default_uuid>` for every existing user.
8. `ALTER TABLE ... ALTER COLUMN org_id SET NOT NULL` on all data tables.

### Migration 5b — Default Organization deletion guard

```sql
-- Mark the default org
ALTER TABLE public.organizations
  ADD COLUMN is_default boolean NOT NULL DEFAULT false;

UPDATE public.organizations
  SET is_default = true
  WHERE id = '<default_org_uuid>';

-- Only the seeded default org can have is_default = true
CREATE UNIQUE INDEX idx_organizations_one_default
  ON public.organizations (is_default) WHERE is_default = true;

-- Prevent deletion of the default org
CREATE OR REPLACE FUNCTION public.prevent_default_org_deletion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'デフォルト組織は削除できません / Default organization cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_default_org_deletion
BEFORE DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION prevent_default_org_deletion();

-- Prevent unsetting is_default (cannot "un-default" the default org)
CREATE OR REPLACE FUNCTION public.prevent_default_org_flag_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_default = true AND NEW.is_default = false THEN
    RAISE EXCEPTION 'Cannot remove default flag from default organization';
  END IF;
  IF OLD.is_default = false AND NEW.is_default = true THEN
    RAISE EXCEPTION 'Cannot promote a non-default organization to default';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_default_org_flag_change
BEFORE UPDATE OF is_default ON public.organizations
FOR EACH ROW EXECUTE FUNCTION prevent_default_org_flag_change();
```

### Migration 6 — Helper functions (read JWT claims)

All helpers are `STABLE`, `SET search_path = public, pg_temp`, read JWT claims (no table queries):

```sql
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE
SET search_path = public, pg_temp AS $$
  SELECT NULLIF(auth.jwt() ->> 'active_org_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE
SET search_path = public, pg_temp AS $$
  SELECT COALESCE(auth.jwt() ->> 'platform_role', '') = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.current_org_role()
RETURNS text LANGUAGE sql STABLE
SET search_path = public, pg_temp AS $$
  SELECT auth.jwt() ->> 'active_org_role';
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean LANGUAGE sql STABLE
SET search_path = public, pg_temp AS $$
  SELECT auth.jwt() ->> 'active_org_role' = 'admin';
$$;

-- Used by organization_members RLS to avoid recursion (SECURITY DEFINER bypasses RLS on that table)
CREATE OR REPLACE FUNCTION public.is_org_admin_of(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;
```

### Migration 7 — Auto-set `org_id` trigger (with spoofing protection)

```sql
CREATE OR REPLACE FUNCTION public.set_org_id_from_jwt()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_ctx_org_id uuid := public.current_org_id();
BEGIN
  IF v_ctx_org_id IS NULL THEN
    RAISE EXCEPTION 'org context missing — active_org_id not set in JWT';
  END IF;

  -- If caller passed org_id, it MUST match the JWT claim. No silent override.
  IF NEW.org_id IS NOT NULL AND NEW.org_id != v_ctx_org_id THEN
    RAISE EXCEPTION 'org_id mismatch: attempted % but JWT active_org_id is %',
      NEW.org_id, v_ctx_org_id;
  END IF;

  NEW.org_id := v_ctx_org_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_org_id_documents BEFORE INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION set_org_id_from_jwt();
-- Repeat for all 15 scoped tables
```

### Migration 8 — Rewrite RLS policies

**Core pattern** (all per-table policies follow this shape):

```sql
-- documents SELECT
CREATE POLICY documents_select ON documents FOR SELECT
USING (
  is_platform_admin()
  OR (org_id = current_org_id() AND (
    user_id = auth.uid() OR current_org_role() = 'admin'
  ))
);

-- documents INSERT (trigger sets org_id, but policy still scopes)
CREATE POLICY documents_insert ON documents FOR INSERT
WITH CHECK (
  org_id = current_org_id() AND user_id = auth.uid()
);

-- documents UPDATE/DELETE
CREATE POLICY documents_update ON documents FOR UPDATE
USING (org_id = current_org_id() AND (user_id = auth.uid() OR current_org_role() = 'admin'))
WITH CHECK (org_id = current_org_id());
```

**`organization_members` policies** (use SECURITY-DEFINER helper to avoid infinite recursion):

```sql
CREATE POLICY org_members_select ON organization_members FOR SELECT
USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR is_org_admin_of(org_id)
);

CREATE POLICY org_members_insert ON organization_members FOR INSERT
WITH CHECK (is_platform_admin() OR is_org_admin_of(org_id));

CREATE POLICY org_members_update ON organization_members FOR UPDATE
USING (is_platform_admin() OR is_org_admin_of(org_id));

CREATE POLICY org_members_delete ON organization_members FOR DELETE
USING (is_platform_admin() OR is_org_admin_of(org_id));
```

**`organizations` policies:**

```sql
CREATE POLICY organizations_select ON organizations FOR SELECT
USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = organizations.id AND user_id = auth.uid() AND is_active
  )
);

CREATE POLICY organizations_all_mgmt ON organizations FOR ALL
USING (is_platform_admin());
```

Full policy set (16 tables x SELECT/INSERT/UPDATE/DELETE = ~60 policies) is enumerated in the migration file.

### Migration 8b — Cross-table same-org invariant triggers

```sql
CREATE OR REPLACE FUNCTION public.assert_same_org(p_org uuid, p_other_org uuid, p_ctx text)
RETURNS void LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_org IS DISTINCT FROM p_other_org THEN
    RAISE EXCEPTION 'cross-org reference rejected (%): % vs %', p_ctx, p_org, p_other_org;
  END IF;
END;
$$;

-- approval_request_documents: request + document must share org
CREATE OR REPLACE FUNCTION public.assert_arq_doc_same_org()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_req_org uuid; v_doc_org uuid;
BEGIN
  SELECT org_id INTO v_req_org FROM approval_requests WHERE id = NEW.approval_request_id;
  SELECT org_id INTO v_doc_org FROM documents WHERE id = NEW.document_id;
  PERFORM assert_same_org(NEW.org_id, v_req_org, 'arq_doc.request');
  PERFORM assert_same_org(NEW.org_id, v_doc_org, 'arq_doc.document');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_arq_doc_same_org BEFORE INSERT OR UPDATE ON approval_request_documents
  FOR EACH ROW EXECUTE FUNCTION assert_arq_doc_same_org();
```

Apply the same pattern to:

- `folders.parent_id` -> parent folder must share org
- `approval_request_step_approvals` -> parent request's org
- `ai_messages.thread_id` -> parent thread's org
- `approval_route_steps.route_id` -> parent route's org
- `document_embeddings.document_id` -> parent document's org
- `submission_embeddings.approval_request_id` -> parent request's org

### Migration 9 — Embedding RPCs

Add `p_org_id uuid` parameter to all SECURITY DEFINER embedding functions:

```sql
CREATE OR REPLACE FUNCTION match_document_embeddings(
  query_embedding vector,
  match_count int,
  p_org_id uuid
) RETURNS TABLE (...) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT ... FROM document_embeddings
  WHERE org_id = p_org_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

Apply to: `match_document_embeddings`, `match_document_embeddings_v2`, `match_document_embeddings_v3`, `match_submission_embeddings`, `hybrid_search_bm25_v4`, `check_user_permission`.

### Migration 10 — `handle_new_user` trigger

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_org_id uuid := (NEW.raw_user_meta_data->>'org_id')::uuid;
  v_role org_role := COALESCE((NEW.raw_user_meta_data->>'role')::org_role, 'requester');
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);

  -- Only create membership if org_id was provided (invite flow).
  -- Signup-without-invite leaves user orgless; UI prompts them to create/join.
  IF v_org_id IS NOT NULL THEN
    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (v_org_id, NEW.id, v_role);
  END IF;

  RETURN NEW;
END;
$$;
```

**Clear stale `active_org_id` on membership removal:**

```sql
CREATE OR REPLACE FUNCTION public.clear_stale_active_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_affected_user uuid;
  v_affected_org  uuid;
BEGIN
  -- Fire for DELETE, or UPDATE that deactivates membership.
  IF TG_OP = 'DELETE' THEN
    v_affected_user := OLD.user_id;
    v_affected_org  := OLD.org_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    v_affected_user := NEW.user_id;
    v_affected_org  := NEW.org_id;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.profiles
  SET settings = settings - 'active_org_id'
  WHERE id = v_affected_user
    AND (settings->>'active_org_id')::uuid = v_affected_org;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_clear_stale_active_org
AFTER UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION clear_stale_active_org();
```

**Invite-existing-user service signature:**

```typescript
// src/service/organization/inviteMember.ts
export async function inviteMemberToOrg(orgSlug, email, role) {
  // 1. Try invite. If user doesn't exist -> invite email flow -> handle_new_user runs.
  // 2. If 'User already registered' -> look up user by email -> INSERT into
  //    organization_members directly -> send in-app notification.
}
```

### Migration 10b — `update_profile_settings` RPC

Merges a jsonb patch into `profiles.settings` without replacing the entire object. Used by `switchActiveOrg` / `switchActiveOrgAs`.

```sql
CREATE OR REPLACE FUNCTION public.update_profile_settings(
  p_user_id uuid,
  p_patch jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.profiles
  SET settings = COALESCE(settings, '{}'::jsonb) || p_patch
  WHERE id = p_user_id;
END;
$$;

-- Only the user themselves or platform admin can call this
REVOKE EXECUTE ON FUNCTION update_profile_settings(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION update_profile_settings(uuid, jsonb) TO authenticated;
```

### Migration 11 — `check_user_permission` RPC

```sql
CREATE OR REPLACE FUNCTION check_user_permission(p_action text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT COALESCE(rp.value, 'denied')
  FROM role_permissions rp
  WHERE rp.org_id = current_org_id()
    AND rp.role = current_org_role()::text
    AND rp.action = p_action
  LIMIT 1;
$$;
```

### Migration 12 — `platform_activity_logs`

```sql
CREATE TABLE public.platform_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN (
    'platform_admin_ui','webhook','cron','edge_function','worker','impersonation'
  )),
  action text NOT NULL,                   -- e.g. 'switch_active_org_as', 'withOrgScope', 'grant_platform_admin'
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,  -- nullable: some events span orgs
  reason text,                            -- required for impersonation; free-form otherwise
  prev_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_activity_logs_created ON public.platform_activity_logs(created_at DESC);
CREATE INDEX idx_platform_activity_logs_actor ON public.platform_activity_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_platform_activity_logs_org ON public.platform_activity_logs(org_id, created_at DESC) WHERE org_id IS NOT NULL;

ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read. Writes happen via SECURITY DEFINER helpers from
-- withOrgScope / switchActiveOrgAs / etc., so no INSERT policy for authenticated users.
CREATE POLICY platform_activity_logs_select ON public.platform_activity_logs FOR SELECT
USING (is_platform_admin());
```

---

## 6. Custom Access Token Hook (JWT claim injection)

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id uuid := (event->>'user_id')::uuid;
  v_claims jsonb := event->'claims';
  v_active_org_id uuid;
  v_active_org_role text;
  v_platform_role text;
BEGIN
  -- Read platform_role from profiles
  SELECT platform_role::text INTO v_platform_role
  FROM profiles WHERE id = v_user_id;

  -- Read "active org" from profile.settings.active_org_id (set when user switches org)
  SELECT (settings->>'active_org_id')::uuid INTO v_active_org_id
  FROM profiles WHERE id = v_user_id;

  -- Resolve current role in that org
  IF v_active_org_id IS NOT NULL THEN
    SELECT role::text INTO v_active_org_role
    FROM organization_members
    WHERE user_id = v_user_id AND org_id = v_active_org_id AND is_active;
  END IF;

  -- Stale-membership guard: if active_org_id points at an org the user is no
  -- longer an active member of (removed/deactivated since last login), drop
  -- the active_org_id so the user lands on the org picker instead of carrying
  -- a half-populated claim set downstream.
  IF v_active_org_id IS NOT NULL AND v_active_org_role IS NULL THEN
    v_active_org_id := NULL;
  END IF;

  v_claims := v_claims
    || jsonb_build_object('platform_role', COALESCE(v_platform_role, 'user'))
    || jsonb_build_object('active_org_id', v_active_org_id)
    || jsonb_build_object('active_org_role', v_active_org_role);

  RETURN jsonb_build_object('claims', v_claims);
EXCEPTION WHEN OTHERS THEN
  -- Fail open with empty custom claims rather than blocking every login.
  -- Server-side getSessionContext will still reject any org-scoped action
  -- because active_org_id will be null -> user lands on the org picker.
  RAISE WARNING 'custom_access_token_hook failed: %', SQLERRM;
  RETURN jsonb_build_object('claims', event->'claims');
END;
$$;
```

**Required grants:**

```sql
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT SELECT ON public.profiles, public.organization_members TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
```

Registered in Supabase dashboard -> Authentication -> Hooks.

### Reading custom claims in server code

Claims injected by `custom_access_token_hook` are written to the **JWT top-level**, not into `app_metadata`/`user_metadata`. `supabase.auth.getUser()` does **not** surface them. To read them server-side, decode the access token:

```typescript
import { jwtDecode } from "jwt-decode";

type AppClaims = {
  active_org_id: string | null;
  active_org_role: "admin" | "approver" | "requester" | "accounting" | null;
  platform_role: "admin" | "user";
};

async function getJwtClaims(supabase: SupabaseClient): Promise<AppClaims> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No session");
  const decoded = jwtDecode<AppClaims & { sub: string; exp: number }>(session.access_token);
  return {
    active_org_id: decoded.active_org_id ?? null,
    active_org_role: decoded.active_org_role ?? null,
    platform_role: decoded.platform_role ?? "user",
  };
}
```

---

## 7. S3 Storage Isolation — RLS Policy

```sql
CREATE POLICY storage_org_isolation ON storage.objects FOR ALL
USING (
  bucket_id = 'documents'
  AND (
    is_platform_admin()
    -- Path is uploads/{org_id}/{user_id}/{uuid}_{filename}
    -- storage.foldername(name) = {uploads, org_id, user_id}; arrays are 1-indexed.
    OR (storage.foldername(name))[2] = current_org_id()::text
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = current_org_id()::text
);
```

> PostgreSQL arrays are 1-indexed. For path `uploads/{org_id}/{user_id}/...`, `foldername[1] = 'uploads'` and `foldername[2] = org_id`. Using `[1]` would compare against the literal `'uploads'` and fail open.

---

## 8. Type Definitions

### `src/types/organization.ts` (new)

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
export type PlatformRole = "admin" | "user";

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
  // Per-membership profile fields (moved from profiles -- see Migration 3b)
  first_name: string | null;
  last_name: string | null;
  department_id: string | null;
  position_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  organization?: Organization;
}
```

### Updated types

- `src/types/user.ts` -- add `platform_role: PlatformRole` to `Profile`; **remove `department_id`, `position_id` from `Profile`** (moved to `OrganizationMember`, see Migration 3b); add `org_id` to `CreateUserParams`.
- `src/types/permission.ts` -- add `org_id: string` to `RolePermission`; `orgSlug` to `UpdateRolePermissionParams`.
- `src/types/department.ts`, `src/types/position.ts` -- add `org_id: string`.
- `src/types/notification.ts` -- add `org_id: string`.

---

## 9. Service Layer — Code

### `src/service/auth/getSessionContext.ts`

```typescript
"use server";

import { supabaseServer } from "@/integrations/supabase/server";

type SessionContextOptions = {
  /** Re-read organization_members in the same request. Use for privileged mutations. */
  verifyMembership?: boolean;
};

export async function getSessionContext(
  orgSlug: string,
  options: SessionContextOptions = {},
) {
  const supabase = await supabaseServer();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  // Custom claims live at the JWT top level (NOT in app_metadata/user_metadata).
  // Decode the access token to read them.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No session");
  const claims = jwtDecode<{
    active_org_id: string | null;
    active_org_role: OrgRole | null;
    platform_role: "admin" | "user";
  }>(session.access_token);

  // Resolve slug -> org_id (cached per request -- see §9.1)
  const org = await resolveOrgBySlug(supabase, orgSlug);
  if (!org || !org.is_active) throw new Error("Organization not found");

  // Platform admin can access any org
  if (claims.platform_role === "admin") {
    return {
      supabase, user, orgId: org.id, orgSlug, org,
      orgRole: "admin" as const, isPlatformAdmin: true,
    };
  }

  // Regular user -- verify JWT claim matches the URL slug
  if (claims.active_org_id !== org.id) {
    throw new Error("JWT org mismatch -- refresh session");
  }

  // Role comes from the JWT claim by default. For privileged mutations,
  // re-read organization_members in this request to close the stale-JWT window.
  let orgRole: OrgRole = claims.active_org_role!;
  if (options.verifyMembership) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role, is_active")
      .eq("user_id", user.id)
      .eq("org_id", org.id)
      .single();
    if (!membership || !membership.is_active) throw new Error("Not a member");
    orgRole = membership.role;
  }

  return {
    supabase, user, orgId: org.id, orgSlug, org,
    orgRole, isPlatformAdmin: false,
  };
}
```

### 9.1 Per-request slug -> org_id cache

```typescript
import { cache } from "react";
export const resolveOrgBySlug = cache(async (supabase, slug: string) => {
  const { data } = await supabase
    .from("organizations")
    .select("id, name, slug, is_active")
    .eq("slug", slug)
    .single();
  return data;
});
```

### 9.2 `withOrgScope` — Service-role callers

```typescript
// src/service/lib/withOrgScope.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type ScopeOptions = {
  /** If provided, assert this user is an active member of orgId before running fn. */
  actingUserId?: string;
  /** Audit context written to platform_activity_logs. */
  reason: string;
  source: "webhook" | "cron" | "edge_function" | "worker";
};

export async function withOrgScope<T>(
  orgId: string,
  opts: ScopeOptions,
  fn: (svc: SupabaseClient, orgId: string) => Promise<T>,
): Promise<T> {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1. Assert org exists and is active.
  const { data: org } = await svc.from("organizations")
    .select("id, is_active").eq("id", orgId).single();
  if (!org || !org.is_active) throw new Error("Org not found or inactive");

  // 2. If an acting user is claimed, verify active membership.
  if (opts.actingUserId) {
    const { data: m } = await svc.from("organization_members")
      .select("role, is_active")
      .eq("org_id", orgId).eq("user_id", opts.actingUserId).single();
    if (!m || !m.is_active) throw new Error("Acting user not a member");
  }

  // 3. Audit log (non-blocking).
  logPlatformActivity({
    source: opts.source, reason: opts.reason, action: "withOrgScope",
    org_id: orgId, actor_user_id: opts.actingUserId ?? null,
  });

  // 4. Callers MUST filter on org_id explicitly in every query inside fn.
  return fn(svc, orgId);
}
```

**Enforcement rules:**

- Lint rule `no-raw-service-role` forbids direct `createClient(SUPABASE_URL, SERVICE_ROLE_KEY, ...)` outside `src/service/lib/withOrgScope.ts` and `withPlatformAdminContext.ts`.
- Callers inside `fn` must write explicit `.eq('org_id', orgId)` filters.
- `withOrgScope` does **not** apply to genuinely global tables (`organizations`, `profiles`, `permissions`) -- those have their own platform-admin-only wrapper `withPlatformAdminContext`.
- Every `withOrgScope` invocation writes one row to `platform_activity_logs`.

---

## 10. Routing & UI — Code

### Next.js middleware

```typescript
// middleware.ts -- validates session and org-slug access at the edge
import { jwtDecode } from "jwt-decode";

export async function middleware(req: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession();
  const pathname = req.nextUrl.pathname;
  const slug = pathname.split("/")[1];

  // Public routes
  if (["login","inactive","auth","_next","favicon.ico"].includes(slug)) return;

  if (!session?.access_token) return NextResponse.redirect(new URL("/login", req.url));

  // Custom claims live at the JWT top level -- NOT in app_metadata/user_metadata.
  // Decode the access token to read them (same pattern as getSessionContext §9).
  const claims = jwtDecode<{
    active_org_id: string | null;
    platform_role: "admin" | "user";
  }>(session.access_token);

  // Platform-admin route
  if (slug === "platform-admin") {
    if (claims.platform_role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return;
  }

  // Org-scoped route: platform admins pass through (can access any slug);
  // regular users with no active_org_id go to the org selector.
  if (claims.platform_role !== "admin" && !claims.active_org_id) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Full slug <-> active_org_id match happens in the server action via
  // getSessionContext (needs a DB lookup; edge middleware stays stateless).
  return;
}
```

> **Note on middleware trust boundary.** The middleware only *decodes* the JWT -- signature verification is not performed at the edge. This is acceptable because the middleware is UX gating, not the security boundary. Every server action re-calls `supabase.auth.getUser()` inside `getSessionContext`, which validates the token against Supabase Auth.

---

## 11. Testing — Implementation Details

### 11.1 pgTAP fixture details

**Fixture:** Org A + Org B, one user each per org role (5 roles x 2 orgs = 10 users), 3 documents per table x org.

**Generated matrix:** 16 tables x 2 orgs x 5 roles x 4 CRUD ops = ~640 assertions. Generator script walks the schema rather than hand-writing each.

**Per-table assertions (each runs under a specific JWT claim set via `request.jwt.claims`):**

1. Non-admin Org-A user -> 0 rows where `org_id = B` (SELECT).
2. Org-A admin -> 0 rows where `org_id = B` (SELECT).
3. Platform admin -> rows from both (SELECT).
4. No active_org_id claim -> 0 rows (SELECT).
5. Alice INSERT with `org_id = B` -> exception from trigger (not silently rewritten).
6. Alice UPDATE Org-B row by UUID -> 0 rows affected (RLS `USING`).
7. Alice DELETE Org-B row by UUID -> 0 rows affected.
8. Alice INSERT without `org_id` -> trigger populates from JWT -> row has `org_id = A`.

**RPC-specific (every SECURITY DEFINER function bypasses RLS):**

- `match_document_embeddings(p_org_id = A)` called by Alice -> zero rows with `org_id != A`.
- Same for `match_document_embeddings_v2/v3`, `match_submission_embeddings`, `hybrid_search_bm25_v4`, `check_user_permission`.

### 11.3 Continuous invariant monitor

```sql
-- cross_org_approval_doc_link: request+document org mismatch
-- cross_org_activity_log: log org != entity org
-- cross_org_step_approval: step org != parent request org
-- cross_org_ai_message: message org != thread org
-- cross_org_role_permission: permission org != member org (unlikely but covered)
```

### 11.4 CI gate

```yaml
- supabase db reset
- supabase test db          # pgTAP
- npm run test:e2e -- multi-tenant-isolation
- assert leakage_invariant_check() rows = 0
- npm run test:query-plans  # EXPLAIN regression suite (see §11.5)
```

### 11.5 Query-plan regression suite

- For each query in a committed allow-list (~15 entries), run `EXPLAIN (FORMAT JSON)` against a seeded two-org dataset (50k rows/org).
- Assert the plan uses the expected composite index and does **not** contain a `Seq Scan` on any org-scoped table.
- Snapshot the plan shape (node types only, not costs) into `__snapshots__/` -- CI fails on drift.

---

## 10b. Slug Aliases — Migration SQL

Referenced in proposal §10 (Slug rename).

```sql
CREATE TABLE public.organization_slug_aliases (
  old_slug text PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slug_aliases_org ON public.organization_slug_aliases(org_id);
```

On slug change, the service inserts the old slug into this table. Middleware looks up unrecognized slugs here and 301-redirects. New slugs must not collide with existing `organizations.slug` OR `organization_slug_aliases.old_slug`.

---

## 12b. `prevent_last_platform_admin_removal` trigger

Referenced in proposal §13 item 12 and risk table.

```sql
CREATE OR REPLACE FUNCTION public.prevent_last_platform_admin_removal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_admin_count int;
BEGIN
  -- Only fire when platform_role is being changed away from 'admin'
  IF OLD.platform_role = 'admin' AND NEW.platform_role != 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.profiles
    WHERE platform_role = 'admin' AND id != OLD.id;

    IF v_admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last platform admin. Promote another user first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_last_platform_admin_removal
BEFORE UPDATE OF platform_role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION prevent_last_platform_admin_removal();

-- Also guard against DELETE of the last platform admin profile
CREATE OR REPLACE FUNCTION public.prevent_last_platform_admin_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_admin_count int;
BEGIN
  IF OLD.platform_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.profiles
    WHERE platform_role = 'admin' AND id != OLD.id;

    IF v_admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last platform admin.';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_last_platform_admin_delete
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION prevent_last_platform_admin_delete();
```

---

## 12c. `log_platform_role_change` audit trigger

Referenced in high-level overview §5 (bad-actor mitigation).

```sql
CREATE OR REPLACE FUNCTION public.log_platform_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.platform_role IS DISTINCT FROM NEW.platform_role THEN
    INSERT INTO platform_activity_logs (
      source, action, actor_user_id, org_id, reason,
      prev_values, new_values
    ) VALUES (
      'platform_admin_ui', 'platform_role_change',
      auth.uid(),  -- null if done via service-role/SQL editor
      NULL,
      CASE WHEN auth.uid() IS NULL THEN 'ALERT: changed via direct DB access (no authenticated user)'
           ELSE 'changed via application' END,
      jsonb_build_object('platform_role', OLD.platform_role),
      jsonb_build_object('platform_role', NEW.platform_role)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_platform_role_change
AFTER UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_platform_role_change();
```

When `auth.uid()` is NULL in the log, the change was made via service-role key or SQL editor — a "bad actor with DB access" red flag.

---

## 12d. `updated_at` auto-update trigger

Apply to all tables that have an `updated_at` column (`organizations`, `organization_members`, and all 17 org-scoped data tables):

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Apply to each table with updated_at
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ... repeat for all tables with updated_at column
```

---

## 9.2b `logPlatformActivity` — Audit Log Helper

Used by `withOrgScope`, `switchActiveOrgAs`, `withPlatformAdminContext`, and other platform-level operations.

```typescript
// src/service/lib/logPlatformActivity.ts
import { supabaseAdmin } from "@/integrations/supabase/admin";

type PlatformActivityEntry = {
  source: string;
  action: string;
  actor_user_id: string | null;
  org_id?: string | null;
  reason?: string;
  prev_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
};

/** Fire-and-forget insert into platform_activity_logs. Uses admin client (bypasses RLS). */
export function logPlatformActivity(entry: PlatformActivityEntry): void {
  supabaseAdmin
    .from("platform_activity_logs")
    .insert(entry)
    .then(({ error }) => {
      if (error) console.error("Failed to log platform activity:", error.message);
    });
}
```

---

## 9.3 `switchActiveOrg` / `switchActiveOrgAs` — Service Code

Referenced in proposal §10 (org switching) and §2 (platform admin writes).

```typescript
// src/service/organization/switchActiveOrg.ts
"use server";

import { supabaseServer } from "@/integrations/supabase/server";

/**
 * Regular user switches their active org context.
 * Verifies the user is an active member of the target org.
 */
export async function switchActiveOrg(orgId: string): Promise<{
  data: { orgSlug: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await supabaseServer();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return { data: null, error: "Unauthorized" };

    // Verify active membership
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role, is_active, org:organizations(slug)")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !membership.is_active) {
      return { data: null, error: "Not an active member of this organization" };
    }

    // Update active_org_id in profile settings (merge, don't replace)
    // Use Supabase's jsonb concatenation to preserve other settings keys
    const { error: updateErr } = await supabase.rpc("update_profile_settings", {
      p_user_id: user.id,
      p_patch: { active_org_id: orgId },
    });
    // Alternative if RPC not available:
    // await supabase.from("profiles")
    //   .update({ settings: supabase.sql`settings || ${JSON.stringify({ active_org_id: orgId })}::jsonb` })
    //   .eq("id", user.id);

    if (updateErr) return { data: null, error: updateErr.message };

    return { data: { orgSlug: membership.org.slug }, error: null };
  } catch (error) {
    console.error("switchActiveOrg failed", error);
    return { data: null, error: "Failed to switch organization" };
  }
}

/**
 * Platform admin switches into an org they may not be a member of.
 * Requires a reason (logged to platform_activity_logs).
 * This is the "impersonation" path — enables platform admin writes into any org.
 */
export async function switchActiveOrgAs(
  orgId: string,
  reason: string,
): Promise<{ data: { orgSlug: string } | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return { data: null, error: "Unauthorized" };

    // Verify caller is platform admin (from JWT claims)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { data: null, error: "No session" };
    const claims = jwtDecode<{ platform_role: string }>(session.access_token);
    if (claims.platform_role !== "admin") {
      return { data: null, error: "Platform admin only" };
    }

    // Verify target org exists and is active
    const { data: org } = await supabase
      .from("organizations")
      .select("id, slug, is_active")
      .eq("id", orgId)
      .single();

    if (!org || !org.is_active) {
      return { data: null, error: "Organization not found or inactive" };
    }

    // Update active_org_id in profile settings (merge, don't replace)
    const { error: updateErr } = await supabase.rpc("update_profile_settings", {
      p_user_id: user.id,
      p_patch: { active_org_id: orgId },
    });

    if (updateErr) return { data: null, error: updateErr.message };

    // Audit log (fire-and-forget)
    logPlatformActivity({
      source: "impersonation",
      action: "switch_active_org_as",
      actor_user_id: user.id,
      org_id: orgId,
      reason,
    });

    return { data: { orgSlug: org.slug }, error: null };
  } catch (error) {
    console.error("switchActiveOrgAs failed", error);
    return { data: null, error: "Failed to switch organization" };
  }
}
```

**Client-side usage (after calling either function):**

```typescript
// After switchActiveOrg / switchActiveOrgAs returns success:
await supabase.auth.refreshSession(); // forces new JWT with updated claims
router.push(`/${orgSlug}/`);
```

---

## 9.4 `withPlatformAdminContext` — Service-role wrapper for global operations

Referenced in §4 (ESLint rule exemption) and §9.2 (`withOrgScope` docs).

```typescript
// src/service/lib/withPlatformAdminContext.ts
"use server";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

type PlatformAdminOptions = {
  /** Free-form reason for the operation (logged). */
  reason: string;
  /** Source system triggering this operation. */
  source: "platform_admin_ui" | "webhook" | "cron" | "edge_function" | "worker";
};

/**
 * Wrapper for operations that span orgs or operate on global tables
 * (organizations, profiles, permissions). Uses service-role key.
 *
 * Unlike withOrgScope (which scopes to a single org), this wrapper is for:
 * - Creating/deleting organizations
 * - Managing platform admins (promote/demote)
 * - Reading cross-org analytics
 * - Backfill migrations
 *
 * Every invocation is logged to platform_activity_logs.
 */
export async function withPlatformAdminContext<T>(
  actorUserId: string,
  opts: PlatformAdminOptions,
  fn: (svc: SupabaseClient) => Promise<T>,
): Promise<T> {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Verify actor is actually a platform admin
  const { data: profile } = await svc
    .from("profiles")
    .select("platform_role")
    .eq("id", actorUserId)
    .single();

  if (!profile || profile.platform_role !== "admin") {
    throw new Error("Caller is not a platform admin");
  }

  // Audit log (non-blocking)
  svc.from("platform_activity_logs").insert({
    source: opts.source,
    action: "withPlatformAdminContext",
    actor_user_id: actorUserId,
    reason: opts.reason,
  });

  return fn(svc);
}
```

---

## 9.5 `createOrganization` — Server Action

Referenced in proposal §5 (Migration 5 seed) and high-level overview §1 (onboarding SOP).

```typescript
// src/service/organization/createOrganization.ts
"use server";

import { withPlatformAdminContext } from "@/service/lib/withPlatformAdminContext";

type CreateOrgParams = {
  name: string;
  slug: string;
  /** Seed standard Japanese departments, positions, and permission matrix. Default: true. */
  seedDefaults?: boolean;
};

export async function createOrganization(
  params: CreateOrgParams,
): Promise<{ data: Organization | null; error: string | null }> {
  try {
    const supabase = await supabaseServer();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return { data: null, error: "Unauthorized" };

    const { seedDefaults = true } = params;

    return await withPlatformAdminContext(user.id, {
      reason: `Create org: ${params.name} (${params.slug})`,
      source: "platform_admin_ui",
    }, async (svc) => {
      // 1. Create organization
      const { data: org, error: orgErr } = await svc
        .from("organizations")
        .insert({ name: params.name, slug: params.slug })
        .select()
        .single();

      if (orgErr) return { data: null, error: orgErr.message };

      // 2. Seed defaults if requested
      if (seedDefaults) {
        // Copy default departments (10 standard Japanese depts)
        // Copy default positions (9 levels, スタッフ → 代表取締役)
        // Copy default role_permissions (130 rows: 4 roles × 26 actions + platform_admin × 26)
        await seedOrgDefaults(svc, org.id);
      }

      return { data: org, error: null };
    });
  } catch (error) {
    console.error("createOrganization failed", error);
    return { data: null, error: "Failed to create organization" };
  }
}

async function seedOrgDefaults(svc: SupabaseClient, orgId: string) {
  // Insert standard Japanese departments
  const depts = [
    "経営企画部", "総務部", "人事部", "経理部", "営業部",
    "マーケティング部", "開発部", "情報システム部", "法務部", "品質管理部",
  ];
  await svc.from("departments").insert(
    depts.map((name, i) => ({ org_id: orgId, name, sort_order: i })),
  );

  // Insert standard Japanese positions (9 levels)
  const positions = [
    { name: "スタッフ", level: 1 }, { name: "主任", level: 2 },
    { name: "係長", level: 3 }, { name: "課長", level: 4 },
    { name: "次長", level: 5 }, { name: "部長", level: 6 },
    { name: "本部長", level: 7 }, { name: "取締役", level: 8 },
    { name: "代表取締役", level: 9 },
  ];
  await svc.from("positions").insert(
    positions.map((p) => ({ org_id: orgId, ...p })),
  );

  // Copy default permission matrix (from the global seed)
  // 4 org roles × 26 actions + platform_admin × 26 = 130 rows
  await svc.rpc("seed_default_role_permissions", { p_org_id: orgId });
}
```

---

## 15. Emergency Rollback — SQL

```sql
-- Deploy to all data tables immediately on leak detection
CREATE POLICY emergency_lock ON <table> FOR ALL USING (false) WITH CHECK (false);
```

Disables all access except service-role. Application returns maintenance page.
