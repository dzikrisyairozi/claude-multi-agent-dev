# TASK L — 役職CRUD最終化 / Position CRUD Finalization

**Priority**: Low
**Assignee**: TBD
**Effort**: S (Small) — QA verification + minor polish
**Status**: Fully implemented, needs finalization

---

## Current State

- **Service**: `src/service/admin/position.ts` — full CRUD
- **Page**: `src/app/admin/positions/` — admin page with table
- **Types**: `src/types/position.ts` — `Position`, `CreatePositionParams`, `UpdatePositionParams`
- **Components**: Create dialog, edit sheet, table with pagination
- **DB**: `positions` table with `id`, `name`, `description`, `level` (integer for hierarchy), `is_active`, timestamps
- **References**: Used in user profiles (`position_id`), approval route steps (`approver_position_id`)

## Scope

QA audit and polish:
1. Verify all CRUD operations work without errors
2. Fix any UI inconsistencies or bugs found
3. Ensure bilingual labels (JP/EN) are complete
4. Verify FK constraint handling (delete position with assigned users)
5. Verify position `level` hierarchy is used correctly in approval routing
6. Ensure position dropdown is consistent across all UIs that reference it

## Acceptance Criteria

- [ ] Create position: form with name, description, level validates and saves
- [ ] Edit position: form pre-populates, saves, table updates
- [ ] Delete position: confirms, removes (or shows warning if users assigned)
- [ ] Toggle is_active: works, inactive positions hidden from dropdowns
- [ ] Position level displayed and sortable in table
- [ ] Position shows correctly in: user profile, route step assignment
- [ ] All labels bilingual (JP/EN)

## Code References

| File | Purpose |
|------|---------|
| `src/service/admin/position.ts` | CRUD service |
| `src/app/admin/positions/page.tsx` | Admin page |
| `src/types/position.ts` | Type definitions |

## Dependencies

- Soft dependency for Task D (route step assignment uses position)
