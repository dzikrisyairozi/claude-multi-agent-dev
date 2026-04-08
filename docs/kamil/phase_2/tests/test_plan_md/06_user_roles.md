# 06 — User Role Tests

Verify role-based access control: Staff sees only their own data, Manager has approval powers, and unauthorized access is blocked.

**Dashboard URL:** `https://eb-filemg-development.vercel.app/`

### Role-Specific Sidebar Navigation

| Sidebar Item | Staff | Manager | Superadmin |
|-------------|-------|---------|------------|
| Dashboard (`/`) | Yes | Yes | `/superadmin/dashboard` |
| AI Chat (`/c`) | Yes | Yes | Yes |
| Files (`/files`) | Yes | Yes | Yes |
| Activity Log (`/activity-log`) | Yes | Yes | Yes |
| Admin Dashboard (`/superadmin/dashboard`) | No | No | Yes |
| Admin Users (`/superadmin/users`) | No | No | Yes |

---

### KT-ROL-001 — Staff sees only own submissions `[Main]` `[P1]`

**Spec Ref:** Spec 6.7 (Permissions), Spec 3 (Stakeholders)

> **Precondition:** Both `staff@gmail.com` and `manager@gmail.com` have submitted ringi

**Steps:**
1. Login with `manager@gmail.com`
2. Submit a ringi (if not already done):
   - **Submission Title:** `Manager's Test Submission`
   - **Priority:** `Low`
   - **Department:** `Management`
   - (fill remaining required fields)
3. Note the title
4. **Logout**, then login with `staff@gmail.com`
5. Go to dashboard at `https://eb-filemg-development.vercel.app/`
6. Check all visible submission cards on the dashboard

**Expected:**
- [ ] Staff can see only their OWN submissions on the dashboard
- [ ] "Manager's Test Submission" is NOT visible to staff
- [ ] No other users' submissions appear in the list

**Result:** Pass / Fail
**Notes:** ___

---

### KT-ROL-002 — Manager sees all + can approve `[Main]` `[P1]`

**Spec Ref:** Spec 6.7 (Permissions), Spec 3 (Stakeholders)

> **Precondition:** Submissions from multiple users exist

**Steps:**
1. Login with `manager@gmail.com`
2. Go to dashboard at `https://eb-filemg-development.vercel.app/`
3. Check visible submission cards
4. Click on any pending submission to open detail at `/approval-requests/[id]`
5. Check available action buttons

**Expected:**
- [ ] Manager can see submissions from ALL users (staff, own, etc.)
- [ ] Green Approve button is visible on pending submissions
- [ ] Red Reject button is visible on pending submissions
- [ ] Manager can distinguish between different submitters

**Result:** Pass / Fail
**Notes:** ___

---

### KT-ROL-003 — Staff cannot see approve/reject buttons `[Basic]` `[P1]`

**Spec Ref:** Spec 6.7 (Permissions), Spec 3 (Stakeholders)

> **Precondition:** Pending submissions exist

**Steps:**
1. Login with `staff@gmail.com`
2. Go to dashboard at `https://eb-filemg-development.vercel.app/`
3. Click on any of your own submissions (pending or any status)
4. Open detail view at `/approval-requests/[id]`
5. Carefully check ALL available action buttons on the page
6. Also check the dashboard card actions

**Expected:**
- [ ] **No** "Approve" button anywhere
- [ ] **No** "Reject" button anywhere
- [ ] **No** "Request Revision" button
- [ ] Staff only sees: Edit (on pending), Cancel (if available), View

**Result:** Pass / Fail
**Notes:** ___

---

### KT-ROL-004 — Manager quick-approve from dashboard `[Basic]` `[P2]`

**Spec Ref:** Spec 6.7 (Permissions), Spec 3 (Stakeholders)

> **Precondition:** Pending submissions visible on manager dashboard

**Steps:**
1. Login with `manager@gmail.com`
2. Go to dashboard at `https://eb-filemg-development.vercel.app/`
3. Find a pending ringi card
4. Look for quick-action buttons on the card (approve/reject without opening detail)
5. If available, use quick-approve

**Expected:**
- [ ] Quick-approve action exists on cards (if implemented)
- [ ] Approval succeeds directly from dashboard
- [ ] Card status updates immediately

**Result:** Pass / Fail
**Notes:** Document if quick-approve is available on cards. ___

---

### KT-ROL-005 — Staff direct URL to admin page `[Edge Case]` `[P1]`

**Spec Ref:** Spec 6.7 (Permissions), Spec 3 (Stakeholders)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. In the browser address bar, manually type:
   ```
   https://eb-filemg-development.vercel.app/superadmin/dashboard
   ```
3. Press Enter
4. Observe what happens
5. Also try:
   ```
   https://eb-filemg-development.vercel.app/superadmin/users
   ```

**Expected:**
- [ ] Staff is **NOT** able to access the admin dashboard page
- [ ] Staff is **NOT** able to access the admin users page
- [ ] Either redirected to dashboard/home at `/`, OR shown access denied page
- [ ] No admin functionality is exposed
- [ ] Sidebar does NOT show admin navigation items for staff role

**Result:** Pass / Fail
**Notes:** ___

---

### KT-ROL-006 — Accountant view-only access `[Edge Case]` `[P3]`

**Spec Ref:** Spec 6.7 (Permissions), Spec 3 (Stakeholders)

> **Precondition:** Accountant role exists in the system (may not be implemented yet)

**Steps:**
1. Check if an accountant test account exists
2. If yes, login with the accountant credentials
3. Go to dashboard at `https://eb-filemg-development.vercel.app/`
4. Navigate to any submission detail at `/approval-requests/[id]`
5. Check available actions on the submission

**Expected:**
- [ ] Accountant can VIEW submissions
- [ ] Accountant **cannot** approve or reject
- [ ] Accountant **cannot** edit submissions
- [ ] View-only access with no action buttons

**Result:** Pass / Fail
**Notes:** If accountant role is not yet implemented, mark as "Skipped - role not available". ___
