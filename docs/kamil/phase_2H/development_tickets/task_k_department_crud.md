# TASK K — 部署CRUD最終化 / Department CRUD Finalization

**Priority**: Low
**Assignee**: TBD
**Effort**: S (Small) — QA verification + minor polish
**Status**: Fully implemented, needs finalization

---

## Current State

- **Service**: `src/service/admin/department.ts` — full CRUD
- **Page**: `src/app/admin/departments/` — admin page with table
- **Types**: `src/types/department.ts` — `Department`, `CreateDepartmentParams`, `UpdateDepartmentParams`
- **Components**: Create dialog, edit sheet, table with pagination
- **DB**: `departments` table with `id`, `name`, `description`, `is_active`, timestamps
- **References**: Used in user profiles (`department_id`), approval route conditions, submission department field

## Scope

QA audit and polish:
1. Verify all CRUD operations work without errors
2. Fix any UI inconsistencies or bugs found
3. Ensure bilingual labels (JP/EN) are complete
4. Verify FK constraint handling (delete department with assigned users)
5. Ensure department dropdown is consistent across all UIs that reference it

## Acceptance Criteria

- [ ] Create department: form validates, saves, appears in table
- [ ] Edit department: form pre-populates, saves, table updates
- [ ] Delete department: confirms, removes (or shows warning if users assigned)
- [ ] Toggle is_active: works, inactive departments hidden from dropdowns
- [ ] Department shows correctly in: user profile, route conditions, submission form, filters
- [ ] All labels bilingual (JP/EN)
- [ ] Pagination works correctly

## Code References

| File | Purpose |
|------|---------|
| `src/service/admin/department.ts` | CRUD service |
| `src/app/admin/departments/page.tsx` | Admin page |
| `src/types/department.ts` | Type definitions |

## Dependencies

- Soft dependency for Task D (route step assignment uses department)
