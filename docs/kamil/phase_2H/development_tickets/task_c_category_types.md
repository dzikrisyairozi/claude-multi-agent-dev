# TASK C — 設定メニュー刷新・カテゴリサブタイプ / Settings Menu Revamp + Category Sub-Types

**Priority**: Critical
**Assignee**: Syahiid
**Effort**: L (Large) — New DB table, new admin page, new service, UI components
**Status**: New feature — nothing exists yet

---

## Current State

- Category is a flat string enum: `"purchasing" | "contracts" | "expenses" | "misc"` (defined in `src/types/approvalRoute.ts` as `ApprovalRouteCategory`)
- Used in: `ApprovalRouteCondition.categories[]`, `ApprovalRequest.category`, submission dialog category dropdown
- Admin pages exist separately: `/admin/users`, `/admin/departments`, `/admin/positions`, `/admin/permissions`, `/admin/approval-routes`
- No unified "Settings" page — each admin feature has its own route
- No sub-category / category_type concept anywhere in the codebase

## Scope

### 1. Settings Page Sidebar Revamp
- Add a Settings section in admin layout with sidebar navigation
- Sidebar items: Approval Routes, Categories Type, Security & Audit, Notifications
- Reuse existing `MainLayout` pattern from `src/app/admin/layout.tsx`

### 2. Category Sub-Types System (Main Feature)
- Parent categories: Contract, Purchasing, Expenses (keep "misc" as-is or remove)
- Each parent has multiple sub-types (e.g., Purchasing → IT Equipment, Office Supplies, Marketing Materials)
- Default "Unspecified" sub-type per parent
- **No conditional logic on category types** — avoids overlap with approval route conditions

### What NOT to Build
- No conditions/restrictions on sub-types (no amount limits enforced by sub-type — that's the approval route's job)
- The max_amount, attachment, notes fields shown in Figma are **informational only** (display in the admin UI, but don't enforce)

## Figma Design Description

**Page**: Settings > Categories Type (node 2184:39873)
- Left sidebar: Settings navigation (Approval Routes, Categories Type, Security & Audit, Notifications)
- Main area: "Categories Type" heading with subtitle "Manage categories subtypes. Each type can have its own restrictions."
- **3 grouped sections** with colored header bars:
  - **Contract** (blue header, icon) — "Legal & Partnerships" subtitle
  - **Purchasing** (blue header, icon) — "Service/Goods Purchase" subtitle
  - **Expenses** (blue header, icon) — "Reimbursements" subtitle
- Each section has "Add Type" button (blue, top-right of header)
- Table columns: Category Type Name | Max Amount | Attachment | Notes
- Example data:
  - Contract: Service Agreement (unlimited, Required, "legal review required")
  - Purchasing: IT Equipment (¥5,000,000, Required, "3 vendor quotes"), Office Supplies (¥200,000, Optional), Marketing Materials (¥1,000,000, Required, "3 vendor quotes")
  - Expenses: Business Travel (¥300,000, Required), Meals & Entertainment (¥50,000, Required)
- Each row has Edit (pencil) and Delete (trash, red) action buttons

## Implementation Steps

### Step 1: Database Migration
```sql
CREATE TABLE category_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,  -- 'purchasing', 'contracts', 'expenses'
  name text NOT NULL,
  description text,
  max_amount numeric,  -- informational, nullable = unlimited
  attachment_requirement text DEFAULT 'optional',  -- 'required' | 'optional'
  notes text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default "Unspecified" per parent
INSERT INTO category_types (category, name, description) VALUES
  ('purchasing', 'Unspecified', 'Default purchasing sub-type'),
  ('contracts', 'Unspecified', 'Default contract sub-type'),
  ('expenses', 'Unspecified', 'Default expense sub-type');

-- RLS: admin/platform_admin can CRUD, accounting can view
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;
```

### Step 2: Types
Create `src/types/categoryType.ts`:
```typescript
export interface CategoryType {
  id: string;
  category: string;  // parent category
  name: string;
  description: string | null;
  max_amount: number | null;
  attachment_requirement: "required" | "optional";
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

### Step 3: Service
Create `src/service/admin/categoryType.ts` — Follow `department.ts` pattern:
- `getCategoryTypes()` — fetch all, grouped by parent category
- `createCategoryType(params)` — insert new sub-type
- `updateCategoryType(id, params)` — update existing
- `deleteCategoryType(id)` — soft delete or hard delete (prevent deleting "Unspecified")

### Step 4: Admin Page
Create `src/app/admin/categories/page.tsx` with `_components/`:
- `CategoryGroupCard.tsx` — Colored header + table for one parent category
- `AddCategoryTypeDialog.tsx` — Create dialog with form fields
- `EditCategoryTypeSheet.tsx` — Edit sheet (slide-in)
- `DeleteCategoryTypeDialog.tsx` — Confirmation dialog

### Step 5: i18n
Add translation keys to `LanguageProvider.tsx`:
- `settings.categoriesType`, `settings.categoriesType.subtitle`
- `categoryType.name`, `categoryType.maxAmount`, `categoryType.attachment`, `categoryType.notes`
- `categoryType.addType`, `categoryType.required`, `categoryType.optional`
- Category parent labels: `category.contract`, `category.purchasing`, `category.expenses`

## Acceptance Criteria

- [ ] Settings page has sidebar navigation with Categories Type section
- [ ] Categories Type page shows 3 parent categories as grouped card sections
- [ ] Each card has colored header with category icon and "Add Type" button
- [ ] Sub-types table shows: Name, Max Amount, Attachment, Notes columns
- [ ] Sub-types can be created with all fields
- [ ] Sub-types can be edited inline or via sheet
- [ ] Sub-types can be deleted (except "Unspecified" defaults)
- [ ] Each parent has "Unspecified" default sub-type (seeded)
- [ ] Data persists correctly after page reload
- [ ] Only Admin can CRUD, Accounting can view (per SYS-003)
- [ ] Bilingual labels (JP/EN) for all UI elements

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Load Categories Type page as Admin | See 3 grouped sections with existing sub-types |
| 2 | Click "Add Type" on Purchasing | Dialog opens with form fields |
| 3 | Create sub-type with all fields | New row appears in table |
| 4 | Edit existing sub-type | Values update correctly |
| 5 | Delete a custom sub-type | Row removed from table |
| 6 | Try to delete "Unspecified" default | Should be prevented or show warning |
| 7 | Load page as Accounting role | Can view but cannot CRUD |
| 8 | Load page as Requester role | Access denied or redirect |
| 9 | Create sub-type with max_amount = null | Shows "-" or "Unlimited" in table |
| 10 | Switch language to Japanese | All labels switch correctly |

## Edge Cases & Gotchas

- **"misc" category**: Current enum includes `misc`. Decide: show it as a 4th group or skip it. Recommendation: skip for now, keep in code for backward compatibility.
- **Existing submissions**: Old submissions have `category: "purchasing"` string. Sub-category is a NEW field — don't break existing data.
- **Unspecified protection**: Prevent deleting the default "Unspecified" type — it's the fallback for submissions without a sub-category.
- **Sort order**: Sub-types should be sortable within a group. Use `sort_order` field.

## Code References

| File | Purpose |
|------|---------|
| `src/types/approvalRoute.ts:1-5` | Current `ApprovalRouteCategory` type |
| `src/service/admin/department.ts` | Pattern to follow for CRUD service |
| `src/app/admin/departments/` | Pattern to follow for admin page |
| `src/app/admin/layout.tsx` | Admin layout with role check |
| `src/providers/LanguageProvider.tsx` | i18n translations dict |

## Permission Matrix Reference

- SYS-003: Configure expense categories — Admin (granted), Accounting (view_only), others (denied)

## Dependencies

- **None** — can start immediately
- **Blocks**: Task E (submission needs sub-category dropdown)
