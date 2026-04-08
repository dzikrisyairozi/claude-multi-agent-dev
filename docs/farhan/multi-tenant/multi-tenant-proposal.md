# Multi-Tenant Architecture Proposal

## Overview

Currently, EB-FILEMG operates as a **single-tenant system** — all users share the same workspace with no concept of organization or company separation. This proposal introduces **multi-tenant architecture** so that each organization (company/team) has its own isolated workspace while sharing the same application.

---

## Why Multi-Tenant?

| Current Limitation | With Multi-Tenant |
|---|---|
| All users see a single shared environment | Each organization has its own isolated data |
| One set of approval routes for everyone | Each organization configures its own approval workflows |
| Single permission matrix shared by all | Each organization customizes its own permission settings |
| One set of departments/positions for everyone | Each organization defines its own departments and positions |
| Single admin manages all users | Each organization has its own admin who manages their team |
| Cannot onboard multiple companies | Can onboard unlimited organizations independently |
| No data separation between teams | Strict data isolation — Organization A cannot see Organization B's data |

---

## What Changes for Users?

### For Regular Users (Requester, Approver, Accounting)
- Users will belong to one or more **organizations**
- After login, users select which organization to work in (or auto-redirect if they only have one)
- All features (files, approvals, AI chat, notifications) work the same — just scoped to their organization
- URLs change slightly: `/files` becomes `/organization-slug/files`

### For Organization Admins (New Role)
- Each organization has its own **admin** who can:
  - Invite and manage users within their organization
  - Configure approval routes for their organization
  - Manage departments and positions for their organization
  - Customize the permission matrix for their organization
  - View activity logs for their organization
- Admin pages are under the org slug: `/organization-slug/admin/users`, `/organization-slug/admin/permissions`, etc.
- This replaces the current "admin" role at the organization level

### For Platform Admins (Replaces Current platform_admin)
- A new top-level role that operates **above** organizations
- Can create and manage all organizations
- Can view and manage any organization's settings
- Has a dedicated dashboard at `/platform-admin/`

---

## Role Structure

```
Platform Admin (system-wide)
  └── Organization Admin (per-org)
        ├── Approver (per-org)
        ├── Requester (per-org)
        └── Accounting (per-org)
```

- A user can belong to **multiple organizations** with different roles in each
- Example: User A is an Admin in Company X, but a Requester in Company Y
- Roles are separated into two tiers:
  - **Platform role** (`admin` / `user`) — stored on user profile, controls system-wide access
  - **Org role** (`admin` / `approver` / `requester` / `accounting`) — stored per membership, controls org-level access

---

## Data Isolation

Every piece of data is tagged to an organization and enforced at the **database level**:

| Data | Isolation |
|---|---|
| Documents & Files | Per organization |
| Folders | Per organization |
| Approval Requests | Per organization |
| Approval Routes | Per organization |
| Departments | Per organization |
| Positions | Per organization |
| Permission Matrix (role_permissions) | Per organization |
| Notifications | Per organization |
| Activity Logs | Per organization |
| AI Chat Threads | Per organization |
| File Storage (S3) | Separated by organization prefix |

Users **cannot** access another organization's data — this is enforced by database security policies, not just application logic.

> **Note:** The `permissions` table (26 action definitions) is shared globally as read-only reference data. Only the `role_permissions` table (the configurable matrix mapping roles to permission values) is scoped per organization.

---

## Scope of Changes

### Database
- 2 new tables: `organizations`, `organization_members`
- 1 new column on all existing data tables: `org_id`
- New `platform_role` column on `profiles` (separate from org-level role)
- Updated `check_user_permission` RPC to be org-scoped
- New security policies on all tables for organization-based access control
- New auto-set trigger to populate `org_id` from session context on insert
- Migration of existing data to a "Default Organization"

### Application
- New URL structure: `/{org-slug}/files`, `/{org-slug}/admin/users`, etc.
- New organization selector page after login
- New platform admin dashboard for managing organizations
- Updated admin pages scoped to organization context:
  - Users, approval routes, departments, positions, permissions
- Organization switcher in the sidebar navigation
- All existing features updated to work within organization context
- Authorization service (`checkPermission`, `isAdminOrSuper`) updated to be org-aware

### What Stays the Same
- Core functionality (file management, approvals, AI chat, notifications) is unchanged
- UI design and components remain the same
- User authentication flow (login/signup) stays the same
- External integrations (S3, OpenAI) are unaffected
- The 26 permission action definitions remain the same (only the matrix becomes per-org)

---

## Impact on Existing Users & Data

- **Zero data loss** — all existing data migrates to a "Default Organization"
- **Existing users** automatically become members of the Default Organization
- **Current platform_admin users** become Platform Admins + Organization Admins in the Default Organization
- **Current admin users** become Organization Admins in the Default Organization
- **Current approver/requester/accounting users** keep their roles within the Default Organization
- **Current permission matrix** is copied as the Default Organization's permission configuration
- **Current departments and positions** become the Default Organization's departments and positions

---

## Implementation Phases

### Phase 1: Database Foundation
Add organization tables, add `org_id` to all data tables (including departments, positions, role_permissions, notifications), migrate existing data, set up helper functions and triggers.

### Phase 2: Core Infrastructure
Create shared utilities, types (Organization, OrgRole, OrganizationMember), and the session context system (`getSessionContext`) that all features depend on. Update type definitions for Permission, Department, Position, and Notification to include `org_id`.

### Phase 3: Service Layer
Update all backend logic (approvals, files, users, activity logs, departments, positions, permissions, notifications, authorization) to be organization-aware. Every server action accepts `orgSlug` and calls `getSessionContext()`.

### Phase 4: URL & Routing
Restructure the application URLs and page layouts to include organization context. Move all current routes under `/[slug]/`, including admin sub-pages (departments, positions, permissions).

### Phase 5: Authentication Updates
Update login flow, add organization selector, organization context provider (`OrgProvider`), and `useOrg` hook. Update all TanStack Query hooks to include `orgSlug` in query keys.

### Phase 6: Platform Admin UI
Build the new platform admin dashboard for managing organizations (create, edit, member management).

### Phase 7: Organization Admin UI
Adapt existing admin pages (users, approval routes, departments, positions, permissions) to work within organization scope.

### Phase 8: Navigation & Polish
Update sidebar, links, organization switcher, and final UI polish.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Data isolation breach between organizations | High | Enforced at database level with Row Level Security — not dependent on application code |
| Permission matrix divergence across orgs | Medium | New orgs seeded with default permission matrix; platform admin can reset if needed |
| Service disruption during migration | Medium | Database changes are additive (no data deletion); backend + security policy changes deployed together |
| Existing users confused by new flow | Low | Existing users auto-assigned to Default Organization; single-org users auto-redirect (no org selection needed) |
| Performance impact | Low | All security checks use in-memory session variables — zero additional database queries per request |

---

## Key Decisions Needed

1. **Default Organization name** — What should the existing organization be called after migration?
2. **Who gets Platform Admin access?** — Which current platform_admin users should have system-wide access vs. just organization admin?
3. **Organization slug format** — Auto-generated from name (e.g., "PT Maju Jaya" → `maju-jaya`) or manually set?
4. **Self-service org creation** — Can users create their own organizations, or only Platform Admins?
5. **Permission matrix on new org** — Copy from default template, or start with empty/minimal permissions?
6. **Department/Position seeding** — Should new orgs get the same default departments/positions, or start empty?

---

## Summary

This change transforms EB-FILEMG from a single-workspace tool into a **multi-organization platform**. Each organization gets full data isolation, its own admin, its own permission configuration, its own departments/positions, and its own approval workflows — while sharing the same application infrastructure. Existing data and users are preserved through automatic migration.
