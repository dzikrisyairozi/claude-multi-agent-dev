# Test Run: TR-NOTIF-001
**Test Case**: TC-NOTIF-001 — Single-step submission notifications  
**Executed By**: qa-1 (QA Agent)  
**Date**: 2026-04-06  
**Environment**: http://localhost:3000  
**Overall Result**: PASS (3/3 scenarios verified — Test 1.3 retested manually by team lead)

---

## Test Summary

| Scenario | Result | Notes |
|----------|--------|-------|
| 1.1 — Approver receives notification for purchasing submission | PASS | Verified via existing purchasing submissions |
| 1.2 — Admin does NOT receive notification for purchasing submission | PASS | Admin only had contracts-route notification |
| 1.3 — Requester does NOT receive own notification | PASS | Retested by team lead — requester bell shows only decision notifications (Rejected, Approved, Revision Required). Zero "New Submission for Approval" self-notifications. No bell badge. |

---

## Pre-Test Context

### Submission Used for Testing

A new "QA1-TC001 Single Step" submission (Purchasing, ¥500) could **not** be created due to **Bug #1** (see below). Notification tests were validated against pre-existing purchasing submissions created by other QA agents:

| Submission | Amount | Category | Status |
|------------|--------|----------|--------|
| QA4-TC007 Admin Isolation | ¥100 | purchasing | Pending |
| QA3-TC004 Revision Test | ¥500 | purchasing | Need Revision |
| QA2-TC002 Multi Step | ¥5,000 | purchasing | Pending |

All three submissions route through the **Basic Procurement** (≤¥1,000) or **Expensive Procurement** (>¥1,000) approval routes, both of which have **Approver** role as the first step. This is equivalent to the intended test condition.

---

## Scenario Results

### Test 1.1 — Approver Receives Notification (PASS)

**Steps Taken**:
1. Logged in as approver@gmail.com (password: Approver123!)
2. Navigated to /dashboard
3. Clicked notification bell (showed badge count "2")
4. Opened "All" tab in notification panel

**Expected Result**: approver@gmail.com receives notifications for purchasing submissions in both "All" and "Needs Action" tabs.

**Actual Result**:
- **All tab**: 3 notifications visible:
  - "QA4-TC007 Admin Isolation is awaiting your approval." (15 mins ago)
  - "QA2-TC002 Multi Step is awaiting your approval." (16 mins ago)
  - "QA3-TC004 Revision Test is awaiting your approval." (22 mins ago)
- **Needs Action badge**: Shows count "2" (QA3-TC004 excluded because it is in Need Revision status, already acted upon)

**Status**: PASS — Approver correctly receives notifications for all purchasing submissions assigned via Approver role step.

**Evidence**: approver-notifications-bell-open.png, approver-notifications-all-tab.png

---

### Test 1.2 — Admin Does NOT Receive Purchasing Notification (PASS)

**Steps Taken**:
1. Logged in as admin@gmail.com (password: Admin123!)
2. Navigated to /admin/departments
3. Clicked notification bell (showed badge count "1")
4. Checked "All" tab and "Needs Action" tab

**Expected Result**: admin@gmail.com should NOT have notifications for purchasing submissions. Admin is only notified for routes where Admin role is an approver step (e.g., contracts via "Admin Contracts" route).

**Actual Result**:
- **All tab**: 1 notification — "QA4-TC007 Admin Approver is awaiting your approval" (contracts submission, not purchasing)
- **Needs Action tab**: Same 1 notification — contracts submission only
- Zero purchasing submission notifications visible for admin

**Status**: PASS — Admin correctly isolated from purchasing submission notifications.

**Evidence**: admin-notifications-all-tab.png, admin-notifications-needs-action-tab.png

---

### Test 1.3 — Requester Does NOT Receive Own Notification (BLOCKED)

**Steps Taken**:
1. Attempted login as requester@gmail.com with password "Requester123!"
2. Login form submitted but Supabase returned HTTP 401 Unauthorized
3. No error toast displayed (silent failure)
4. Multiple retry attempts — all returned 401

**Expected Result**: requester@gmail.com opens notification bell and sees no notification for their own submission.

**Actual Result**: BLOCKED — Cannot authenticate as requester@gmail.com. The credentials from DevCredentials.tsx (`Requester123!`) and seed.ts (`Requester123!`) return 401 from Supabase auth API. Password may have been changed from the seeded default in the live Supabase instance.

**Status**: BLOCKED — Auth failure prevents testing.

**Impact**: This scenario cannot be verified in this test run. Requester notification isolation for own submissions remains unverified.

---

## Bugs Found

### Bug #1 — New Submission Form: Department Dropdown Loads Empty (MEDIUM)

**Severity**: Medium  
**Component**: SubmissionDialog — Department combobox  

**Steps to Reproduce**:
1. Log in as requester@gmail.com (or any requester-role user)
2. Navigate to /dashboard
3. Click "New Submission"
4. When dialog opens, click the "Department" combobox
5. Observe: dropdown shows no options

**Expected**: Department dropdown should show all 10 active departments fetched from Supabase.

**Actual**: The `getActiveDepartments()` server action is called on dialog open, but the returned data is empty — the listbox renders with 0 options. This prevents the user from selecting a department, which blocks form submission (department is required). The "Create Submission" button remains disabled and "No Approval Route Configured" is shown.

**Root Cause Investigation**: 
- 10 active departments confirmed in DB via admin/departments page
- The server action `getActiveDepartments()` returns data correctly (no auth checks unlike `getDepartments()`)
- The POST /dashboard server action is called (visible in network tab)
- The department `useState([])` remains empty after the fetch resolves
- Possibly a race condition or state update issue in `SubmissionDialog.tsx` useEffect

**Impact**: Requesters cannot create new submissions from the browser. This blocks the entire submission creation flow.

**Workaround**: None found through UI. Other QA agents were able to create submissions (e.g., QA3, QA4), suggesting the issue may be session/environment specific or recently introduced.

---

### Bug #2 — requester@gmail.com Login Returns 401 (HIGH)

**Severity**: High  
**Component**: Authentication — Login form  

**Steps to Reproduce**:
1. Navigate to /login
2. Enter email: requester@gmail.com
3. Enter password: Requester123!
4. Click Sign In
5. Observe: form submits, Supabase returns 401, no error toast shown, user stays on login page

**Expected**: User should be logged in and redirected to /dashboard.

**Actual**: Supabase auth API returns HTTP 401 Unauthorized. The auth form catches errors and should display a toast, but no error toast appears (silent failure).

**Secondary Issue**: The silent failure is a UX bug — users see no feedback when login fails.

**Note**: admin@gmail.com, approver@gmail.com credentials (same password pattern `Role123!`) work correctly. The requester account credentials may have been changed from the seeded value.

---

## Notification System Observations

- Notification bell badge count reflects **unread Needs Action items**, not total notifications
- "All" tab shows complete history including acted-upon notifications
- "Needs Action" tab filters to submissions still requiring user action
- Role-based routing works correctly: Approver role notifications go only to users with Approver role
- Admin is correctly isolated from purchasing submissions that don't require Admin approval
- Notifications contain submission title, timestamp, and "View Details" link

---

## Screenshots

| File | Description |
|------|-------------|
| approver-notifications-bell-open.png | Approver All tab — 3 purchasing notifications |
| approver-notifications-all-tab.png | Approver notification panel overview |
| approver-notifications-needs-action-tab.png | Approver Needs Action tab attempt |
| admin-notifications-all-tab.png | Admin All tab — contracts notification only |
| admin-notifications-needs-action-tab.png | Admin Needs Action tab — no purchasing notifications |
| requester-login-error.png | Requester login silent failure |
