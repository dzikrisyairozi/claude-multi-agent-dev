# Multi-Tenant Architecture — High-Level Overview

**Author:** Dzikri
**Date:** 2026-04-06
**Companion to:** [`multi-tenant-architecture-proposal.md`](./multi-tenant-architecture-proposal.md) (high-level architecture) and [`multi-tenant-implementation-details.md`](./multi-tenant-implementation-details.md) (SQL/TypeScript code)

> **Decision pending (§6):** Sections §1 (seed table), §3 (org admin capabilities) assume **per-org permission matrix customization** (Option B). If Endo-san approves **Option A (global matrix)**, adjust: §1 seed table (remove permission matrix row), §3 capability table (org admin cannot customize permissions — platform admin only).

---

## 1. Tenant Onboarding SOP — New Company Setup

### Prerequisites

- At least one `platform_role = 'admin'` account exists (bootstrapped via Migration 5)
- Application is deployed with multi-tenant migrations applied

### Step-by-Step

| # | Action | Who | Where | Time |
|---|--------|-----|-------|------|
| 1 | Create organization (name + slug) | Platform Admin | `/platform-admin/organizations` → "Create" | ~30 sec |
| 2 | Choose seed option: standard Japanese depts/positions or blank | Platform Admin | Create dialog checkbox | ~5 sec |
| 3 | Verify auto-seeded data (departments, positions, permission matrix) | Platform Admin | Org detail page | ~1 min |
| 4 | Invite first org admin by email | Platform Admin | Same page → "Invite Member" | ~1 min |
| 5 | Org admin accepts invite, logs in | Client's Org Admin | Email invite link | ~2 min |
| 6 | Org admin customizes org settings (depts, positions, approval routes, permissions) | Client's Org Admin | `/{slug}/admin/*` | 30 min – 2 hrs |
| 7 | Org admin invites remaining users | Client's Org Admin | `/{slug}/admin/users` | Varies |
| 8 | (Optional) Configure custom domain | Platform Admin | Vercel dashboard / API | ~10 min + DNS propagation |

**Total platform-admin effort: ~5 minutes.** The org admin then self-serves.

### What Gets Auto-Seeded on Org Creation

| Data | Count | Source | Customizable? |
|------|-------|--------|---------------|
| Permission matrix (`role_permissions`) | 130 rows (4 roles × 26 actions + platform_admin × 26) | Copy of default matrix | Yes — per-org via `/{slug}/admin/permissions` |
| Departments | 10 rows (standard Japanese corporate structure) | Copy of default set | Yes — org admin can add/edit/delete |
| Positions | 9 rows (スタッフ → 代表取締役, levels 1–9) | Copy of default set | Yes — org admin can add/edit/delete |

All seeds are inserted automatically in the `createOrganization()` server action — no manual steps.

### Seed Strategy — Japan Client Perspective

The default seeds follow standard Japanese corporate structure:

**Departments:** 経営企画部, 総務部, 人事部, 経理部, 営業部, マーケティング部, 開発部, 情報システム部, 法務部, 品質管理部

**Positions (with hierarchy):** スタッフ (L1) → 主任 (L2) → 係長 (L3) → 課長 (L4) → 次長 (L5) → 部長 (L6) → 本部長 (L7) → 取締役 (L8) → 代表取締役 (L9)

Most Japanese SMBs will have 5–6 of these departments and nearly all of these position levels. Starting with seeds lets the client edit/delete what they don't need (~2 min) rather than create everything from scratch (~5–10 min).

**Recommendation:** Offer a toggle in the create-org dialog:

```
☑ 日本標準の部署・役職をセットアップ (Seed standard Japanese departments/positions)
```

Checked by default. Platform admin unchecks for non-standard clients.

---

## 2. Custom Domain Setup (Optional per Tenant)

### Architecture

Custom domains are **not** Vercel rewrites (`vercel.json`). They use:

1. **Vercel Custom Domains** — add domain via Vercel dashboard or SDK
2. **Next.js middleware** — `NextResponse.rewrite()` maps hostname → org slug at the edge
3. **Automatic SSL** — Vercel provisions certificates automatically

### Two Approaches

| Approach | Setup | Client DNS | Example |
|----------|-------|-----------|---------|
| **Wildcard subdomain** | Add `*.app.eb-filemg.com` to Vercel (one-time) | None needed | `yamada.app.eb-filemg.com` |
| **Client's own domain** | Add domain via Vercel API per tenant | Client adds CNAME → `cname.vercel-dns.com` | `files.yamada-industries.co.jp` |

### How It Works

```
Browser: files.yamada.co.jp/approval-requests
    ↓
Vercel: routes to your deployment (custom domain registered)
    ↓
Next.js middleware: reads hostname → resolves to org slug "yamada"
    ↓
Internal rewrite: serves /yamada/approval-requests
    ↓
Browser URL: still shows files.yamada.co.jp/approval-requests (no change)
```

### Setup Time

| Step | Time |
|------|------|
| Add domain to Vercel (your side) | ~5 min |
| Client adds CNAME record | ~5 min |
| DNS propagation | 24–48 hours |
| SSL auto-provisioned | Automatic after DNS resolves |

### What Needs to Be Built (Phase 3)

- `custom_domain` field in `organizations.settings` (or dedicated `organization_domains` table)
- Middleware hostname → org resolution logic
- Platform-admin UI for domain management
- DNS verification status display

---

## 3. Role Model — High-Level Summary

### Two-Tier Role System

```
Platform Admin (system-wide, above all orgs)
  └── Organization A
        ├── Org Admin (manages this org)
        ├── Approver
        ├── Requester
        └── Accounting
  └── Organization B
        ├── Org Admin
        ├── ...
```

| Dimension | `platform_role` | Org role |
|-----------|----------------|----------|
| Stored in | `profiles.platform_role` | `organization_members.role` |
| Scope | System-wide | Per-organization |
| Values | `admin` / `user` | `admin` / `approver` / `requester` / `accounting` |
| Who manages | Other platform admins | Org admins (within their org) |
| Visible to user | Badge + nav link to `/platform-admin/` | Role badge in org context |

### What Each Role Can Do

| Capability | Platform Admin | Org Admin | Approver / Requester / Accounting |
|-----------|---------------|-----------|----------------------------------|
| Create/manage organizations | Yes | No | No |
| See all orgs' data (read) | Yes | No | No |
| Manage users in an org | Yes (any org) | Yes (own org) | No |
| Customize permission matrix | Yes (any org) | Yes (own org) | No |
| Manage depts/positions | Yes (any org) | Yes (own org) | No |
| Promote to platform admin | Yes | No | No |
| Write into a specific org | Must switch context first | Own org only | Own org only |

### UI Visibility

| User type | After login | What they see in nav |
|-----------|-------------|---------------------|
| Regular user (1 org) | Auto-redirect to `/{slug}/` | Role badge: "Admin" / "Approver" / etc. |
| Regular user (2+ orgs) | Org picker → select → redirect | Role badge for current org + org switcher |
| Platform admin | Same as above + platform admin indicator | Extra nav item: "Platform Admin" → `/platform-admin/` |

**Users never see "Platform Role: user & Org Role: admin".** They see their org role badge. Platform admin is shown as an additional indicator, not a replacement.

### User Table (`/{slug}/admin/users`)

| Column | Source | Notes |
|--------|--------|-------|
| Name | `organization_members.first_name/last_name` | Per-org (user can have different display in different orgs) |
| Email | `profiles.email` | Global |
| Role | `organization_members.role` | Org role only (admin/approver/requester/accounting) |
| Department | `organization_members.department_id` | Per-org |
| Position | `organization_members.position_id` | Per-org |
| Status | `organization_members.is_active` | Per-org membership status |
| Platform badge | `profiles.platform_role` | Small icon if user is also a platform admin. Visible to org admins only. |

---

## 4. Platform Admin Bootstrapping & Lifecycle

### Initial Creation

Platform admins are bootstrapped via **Migration 5** — existing `platform_admin` role holders are mapped to `platform_role = 'admin'`. No secret endpoints or scripts needed.

### Ongoing Management

| Action | How | Logged? |
|--------|-----|---------|
| Promote user to platform admin | Platform admin UI (`/platform-admin/`) | Yes → `platform_activity_logs` |
| Demote platform admin | Platform admin UI | Yes → `platform_activity_logs` |
| Demote last platform admin | **Blocked** by DB trigger | N/A |
| Emergency recovery (all admins lost) | Direct SQL on Supabase: `UPDATE profiles SET platform_role = 'admin' WHERE email = '...'` | Manual audit entry required |

### Account Limits

No hard limit on `platform_role = 'admin'` accounts. Practical recommendation: **2–5** (super-users should be minimal).

---

## 5. Security — Bad Actor Mitigation Plan

### Threat: Compromised Platform Admin Account

If a bad actor gains access to a `platform_role = 'admin'` account:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Read all orgs' data | Critical — full data breach | See detection/response below |
| Create/delete orgs | High — service disruption | All actions logged to `platform_activity_logs` |
| Modify permission matrices | High — privilege escalation for other users | Activity log audit trail |
| Promote other accounts to platform admin | Critical — persistence | Logged; alerting on new platform admin creation |

#### Prevention

1. **Minimal platform admin count** — 2–5 accounts maximum. Fewer accounts = smaller attack surface.
2. **MFA enforcement** — Platform admin accounts should require MFA (Supabase Auth supports TOTP). Phase 3 item.
3. **No shared accounts** — Each platform admin is a named individual.
4. **Strong password policy** — Enforced at Supabase Auth level.
5. **Session timeout** — Short session TTL for platform admin sessions (stricter than regular users). Phase 3 item.

#### Detection

1. **`platform_activity_logs`** — Every platform-admin action is logged with actor, action, timestamp, reason.
2. **Anomaly alerts** — Alert on:
   - New `platform_role = 'admin'` grants
   - `switchActiveOrgAs` calls (platform admin impersonating an org)
   - Bulk data reads across multiple orgs in short timeframe
   - Org creation/deletion outside business hours
3. **`leakage_invariant_check()`** — Hourly pg_cron job detects cross-org data anomalies.

#### Response — If a Platform Admin Account is Compromised

| Step | Action | Time |
|------|--------|------|
| 1 | **Immediately disable** the compromised account: `UPDATE profiles SET platform_role = 'user', is_active = false WHERE id = '<compromised_user_id>'` | < 5 min |
| 2 | **Rotate Supabase service-role key** if there's any chance it was exposed | < 10 min |
| 3 | **Audit `platform_activity_logs`** for all actions by the compromised account | < 30 min |
| 4 | **Review `organization_members`** for unauthorized role changes or new memberships | < 30 min |
| 5 | **Check for new platform admins** created by the compromised account and revoke | < 15 min |
| 6 | **Review permission matrix changes** across all orgs — revert unauthorized changes | < 1 hr |
| 7 | **Notify affected org admins** if their org data was accessed | < 2 hrs |
| 8 | **Post-mortem** — root cause, how access was gained, remediation | < 24 hrs |

### Threat: Compromised Org Admin Account

Blast radius is limited to **one organization** (by design — RLS enforces this).

| Step | Action |
|------|--------|
| 1 | Platform admin disables the account or changes their org role |
| 2 | Audit `activity_logs` (org-scoped) for that user |
| 3 | Review permission matrix changes in that org |
| 4 | Notify other org admins |

### Threat: Direct DB Manipulation (e.g., someone changes `platform_role` directly in DB)

This requires **Supabase dashboard access** or **service-role key**. Mitigations:

1. **Supabase dashboard access** — Restrict to named individuals. Enable Supabase's audit log.
2. **Service-role key** — Store in environment variables only. Never expose to client. Rotate periodically.
3. **DB trigger alert** — Add a trigger on `profiles` that logs to `platform_activity_logs` whenever `platform_role` is changed:

```sql
-- Trigger: log all platform_role changes
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

When `auth.uid()` is NULL in the log, it means the change was made via service-role key or SQL editor — this is the "bad actor with DB access" red flag.

4. **`prevent_last_platform_admin_removal`** trigger — Even a bad actor with DB access cannot demote the last platform admin. The trigger blocks it at the DB level.

---

## 6. Permission Matrix Scope — Decision Required

> **Status:** Pending Endo-san's approval. This section presents two options for the permission matrix in the multi-tenant architecture. The team recommends Option A for Phase 2 to reduce scope and risk, with Option B deferred to Phase 3.

### Context — What We Have Today

The current permission system is already built and working:

| Component | Status | Size |
|-----------|--------|------|
| 26 permission actions (5 categories) | Done | `src/types/permission.ts` (85 lines) |
| `role_permissions` table (130 rows: 5 roles × 26 actions) | Done | 3 migrations (356 lines SQL) |
| CRUD service (`getPermissionMatrix`, `updateRolePermission`) | Done | `src/service/admin/permission.ts` (174 lines) |
| Authorization service (`checkPermission` → DB RPC) | Done | `src/service/auth/authorization.ts` (142 lines) |
| Interactive matrix UI (color-coded, dropdowns, optimistic updates) | Done | `src/app/admin/permissions/_components/permission-matrix.tsx` (261 lines) |

**Total existing code: ~1,018 lines across 8 files.** This all works today in the single-tenant model.

### The Question

In the multi-tenant proposal, we designed **per-org permission matrix customization** — each organization gets its own copy of the 130-row matrix, and org admins can customize it independently. This means:

- Org A (strict): `requester` cannot `view_all_submissions`
- Org B (open): `requester` has `granted` on `view_all_submissions`

**The concern:** This feature adds significant migration complexity, testing surface, and ongoing maintenance cost. Given team readiness and timeline, we should decide whether to include it in Phase 2 or defer it.

---

### Option A: Global Permission Matrix (Recommended for Phase 2)

**All organizations share one permission matrix.** Platform admin manages it globally. Org admins cannot customize permissions per-org.

#### What Changes from Current System

| Area | Change | Effort |
|------|--------|--------|
| `role_permissions` table | **No `org_id` added** — stays global (1 copy of 130 rows) | None |
| `permissions` table | Stays global (already planned) | None |
| `check_user_permission` RPC | Reads org role from JWT, looks up **global** matrix | Minor tweak (~1 hr) |
| Permission CRUD service | Add org-role awareness (read role from `organization_members` instead of `profiles`) | ~0.5 day |
| Permission UI | Move from `/admin/permissions` → `/platform-admin/permissions` (platform admin only) **OR** keep at `/{slug}/admin/permissions` as read-only for org admins | ~0.5 day |
| Migration 4 | `role_permissions` does **NOT** get `org_id` → **16 tables** instead of 17 | Simpler |
| Seeding on new org | **No permission seeding needed** — all orgs read the same global matrix | None |
| Backfill for new permissions | Add 1 row to global `role_permissions` → applies to all orgs automatically | Trivial |
| Testing | No cross-org permission isolation tests needed | Significantly less |

#### Effort Estimate — Option A

| Phase | Task | Estimate |
|-------|------|----------|
| **Migration** | Add `org_id` to 16 tables (not 17), backfill, RLS rewrite | **2–3 days** |
| **Service layer** | `getSessionContext`, org switching, org CRUD, `check_user_permission` tweak | **2–3 days** |
| **UI** | Org switcher, slug-based routing, platform admin dashboard, move permission page | **2–3 days** |
| **Testing** | pgTAP cross-org isolation (~500 assertions instead of 640+), E2E for org flows | **1–2 days** |
| **Total** | | **~7–11 days** |

> Estimates assume team familiarity with Supabase/Next.js, existing permission system (1,018 lines already built), and repeatable RLS policy patterns across tables.

#### What Orgs Lose

- Org admins **cannot** customize which roles have which permissions
- All orgs follow the same permission rules (e.g., if `requester` can `view_all_submissions` globally, it applies to every org)
- Platform admin is the only one who can change the permission matrix

#### Upgrade Path to Option B Later (Phase 3)

This is **fully forward-compatible**. When ready:
1. Add `org_id` to `role_permissions` + backfill (1 migration)
2. Copy global matrix into per-org rows (data migration)
3. Update service/UI to scope by org
4. No breaking changes — existing permission checks continue to work

---

### Option B: Per-Org Permission Matrix Customization

**Each organization gets its own copy of the 130-row matrix.** Org admins can customize independently.

#### What's Required Beyond Option A

| Area | Additional Work | Effort |
|------|----------------|--------|
| `role_permissions` table | Add `org_id`, composite unique constraint `(org_id, role, permission_id)` | ~0.5 day |
| Seeding on new org creation | `seed_default_role_permissions(p_org_id)` — copy 130 rows per new org | ~0.5 day |
| Backfill mechanism | When a new permission action is added globally, a migration must INSERT the corresponding `role_permissions` row for **every existing org** | ~0.5 day |
| Permission CRUD service | Modify all queries to filter by `org_id` via `getSessionContext` | ~0.5 day |
| `check_user_permission` RPC | Add `current_org_id()` filter | ~0.5 day |
| Permission UI | Per-org matrix at `/{slug}/admin/permissions` + "Reset to defaults" button | ~1 day |
| RLS on `role_permissions` | New policies: org admin can only edit their own org's matrix | ~0.5 day |
| Cross-org permission isolation tests | Org A admin edits matrix → Org B unaffected (pgTAP + E2E) | ~1 day |

#### Effort Estimate — Option B

| Phase | Task | Estimate |
|-------|------|----------|
| **Everything in Option A** | | **7–11 days** |
| **Additional migration + service** | `org_id` on `role_permissions`, seeding RPC, backfill, per-org CRUD, RLS | **+2–3 days** |
| **Additional testing** | Cross-org permission isolation, per-org enforcement matrix, seeding verification | **+2 days** |
| **Total** | | **~11–16 days** |

#### Ongoing Maintenance Cost

- Every new feature that adds a permission action requires a backfill migration across all orgs
- Debugging permission issues is harder (must check per-org matrix, not just global)
- More complex onboarding (org admin must understand and configure the matrix)

---

### Comparison Summary for Endo-san

| Dimension | Option A (Global) | Option B (Per-Org) |
|-----------|-------------------|-------------------|
| **Dev effort** | ~6–9 days | ~9–14 days |
| **Testing effort** | ~1–2 days | ~2–3 days |
| **Total estimate** | **~7–11 days** | **~11–16 days** |
| **Delta** | Baseline | **+4–5 days** |
| **Risk** | Lower — no cross-org permission state to manage | Higher — seeding, backfill, per-org isolation |
| **Org admin flexibility** | None — platform admin controls permissions | Full — each org customizes independently |
| **Upgrade path** | Forward-compatible → can add per-org later | N/A (already included) |
| **Team readiness** | Ready now | Needs more preparation time |
| **Maintenance burden** | Low — one matrix, simple backfill | Higher — N matrices, backfill across all orgs |
| **Typical SMB need** | Most Japanese SMBs use identical permission structures | Useful if client orgs have very different workflows |

### Recommendation

**Phase 2: Option A (Global).** Ship multi-tenant with a shared permission matrix. This delivers the core value (data isolation, per-org users/depts/positions, approval routes) without the permission customization complexity.

**Phase 3: Option B (Per-Org).** When the team has capacity and there's confirmed client demand for per-org permission differences, upgrade. The migration path is clean and non-breaking.

> **Decision owner: Endo-san.** Please confirm which option to proceed with.

---

## 7. QA / Testing Perspective — RBAC Test Matrix

### Minimum test coverage

```
Per org (test with at least 2 orgs: Org A, Org B):
  Per role (admin, approver, requester, accounting):
    Per action (26 permission actions):
      ✓ Verify permission value matches the matrix (global if Option A, per-org if Option B)
      ✓ Verify action is enforced in UI + API

Cross-tenant (Option A: ~500 assertions, Option B: 640+ assertions):
  ✓ Org A user cannot read Org B data
  ✓ Org A user cannot write into Org B
  ✓ Org A admin cannot see Org B's users
  [Option B only] ✓ Org A admin cannot modify Org B's permission matrix
  [Option B only] ✓ Org A permission change does not affect Org B

Platform admin:
  ✓ Can read all orgs' data
  ✓ Can create/manage orgs
  ✓ Cannot write without switching context
  ✓ Can promote/demote platform admins
  ✓ Cannot demote the last platform admin
  ✓ All actions logged to platform_activity_logs

Bad actor scenarios:
  ✓ Direct DB platform_role change → triggers audit log
  ✓ Last platform admin demotion → blocked by trigger
  ✓ Spoofed org_id in request → rejected by trigger
  ✓ JWT with wrong active_org_id → rejected by getSessionContext
```
