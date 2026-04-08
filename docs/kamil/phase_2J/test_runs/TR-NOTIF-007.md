# Test Run: TR-NOTIF-007
**Test Case**: TC-NOTIF-007 — Admin Notification Isolation  
**Executed By**: QA Agent (qa-4)  
**Date**: 2026-04-06  
**Environment**: http://localhost:3000  
**Result**: PASS

---

## Test Summary

| Scenario | Status |
|----------|--------|
| 7.1: Admin NOT in route receives zero notifications | PASS |
| 7.2: Admin assigned as step approver receives notification | PASS |

**Overall**: 2/2 PASS — Admin notification isolation is working correctly.

---

## Pre-conditions

- Route "Basic Procurement": Category=purchasing, ≤¥1,000, 1 step (Role: Approver)
- Route "Admin Contracts": Category=contracts, 1 step (Role: Admin)
- All notifications cleared before test run

---

## Test 7.1: Admin NOT in route receives zero notifications

### Scenario
A Purchasing submission is routed to Approver role only. Admin, who is not in the route, should receive NO notification.

### Steps Taken
1. Logged in as requester@gmail.com
2. Created submission:
   - Title: "QA4-TC007 Admin Isolation"
   - Category: Purchasing
   - Item: Pens, qty=1, price=¥100
   - Vendor: Test Vendor Co.
   - Department: マーケティング部 / Marketing
   - Payment Method: Bank Transfer (explicitly selected)
   - Payment Schedule Date: 2026-05-01
   - Required by Date: 2026-05-15
   - Reason: QA test for admin isolation - purchasing route
   - Purpose: Testing admin notification isolation
3. Submitted successfully ("Submission created successfully" toast shown)
4. Logged out as requester
5. Logged in as admin@gmail.com
6. Checked bell icon — no badge shown
7. Opened Notifications panel → All tab: showed "No notifications"
8. Switched to Needs Action tab: showed "No notifications"
9. Verified dashboard still shows "QA4-TC007 Admin Isolation" (Pending, Category=purchasing, ¥100) — admin can view all submissions as admin role

### Expected Result
- Bell badge: none
- All tab: "No notifications"
- Needs Action tab: "No notifications"
- Dashboard: submission visible

### Actual Result
- Bell badge: none (confirmed)
- All tab: "No notifications" (confirmed)
- Needs Action tab: "No notifications" (confirmed)
- Dashboard: "QA4-TC007 Admin Isolation" visible in All 4/Pending 4

### Status: PASS

### Notes
- Encountered a "No Approval Route Configured" issue on first attempt due to Payment Method combobox not registering the default "Bank Transfer" value. Required explicitly selecting the option from the dropdown to pass form validation.
- This is a form UX issue: the default value shown is not actually set until user interacts with the dropdown.

---

## Test 7.2: Admin assigned as step approver receives notification

### Scenario
A Contract submission is routed to Admin role. Admin should receive a "New Submission for Approval" notification.

### Steps Taken
1. Logged out admin, logged in as requester@gmail.com
2. Created submission:
   - Title: "QA4-TC007 Admin Approver"
   - Category: Contract (Legal & Partnerships)
   - Vendor: Contract Vendor Ltd.
   - Department: マーケティング部 / Marketing
   - Payment Method: Bank Transfer (explicitly selected)
   - Payment Schedule Date: 2026-06-01
   - Required by Date: 2026-06-15
   - Reason: QA test - admin as contract approver notification
   - Purpose: Verify admin receives notification when assigned as step approver
   - Items: NOT added (not required for contracts)
   - Estimated Approval Route showed: Requester → DRAFT, Admin Review → PENDING
3. Submitted successfully ("Submission created successfully" toast shown)
4. Logged out requester
5. Logged in as admin@gmail.com
6. Bell icon showed badge "1"
7. Opened Notifications panel → All tab: showed "New Submission for Approval — QA4-TC007 Admin Approver is awaiting your approval." (1 min ago)
8. Switched to Needs Action tab: same notification visible, badge = 1

### Expected Result
- Bell badge: ≥ 1
- All tab: shows "New Submission for Approval" notification for QA4-TC007 Admin Approver
- Needs Action tab: same notification, badge ≥ 1

### Actual Result
- Bell badge: 1 (confirmed)
- All tab: "New Submission for Approval — QA4-TC007 Admin Approver is awaiting your approval." (confirmed)
- Needs Action tab: same notification with badge "1" (confirmed)

### Status: PASS

---

## Issues Found

### Minor Issue: Payment Method Default Value Not Registered (Medium Severity)

**Description**: When the submission form opens, "Bank Transfer" appears to be shown as the default value in the Payment Method dropdown, but it is not actually set as a form value. Submitting without explicitly opening and selecting from the dropdown causes a "Payment Method is required" validation error.

**Steps to Reproduce**:
1. Open New Submission modal
2. Fill all fields EXCEPT do not click the Payment Method dropdown
3. Click "Create Submission"
4. Observe: "Payment Method is required" validation error appears even though "Bank Transfer" text is displayed

**Expected**: The displayed default value should be pre-selected and valid for form submission.

**Actual**: Default display value is cosmetic only — validation fails unless user explicitly selects from the dropdown.

**Severity**: Medium  
**Impact**: Confusing UX — users see a value displayed but get a validation error. Could cause confusion and abandoned submissions.

---

## Screenshots Reference

Key screenshots captured during testing:
- Login page loaded
- Requester dashboard after submission 7.1 (4 submissions total)
- Admin bell — no badge (Test 7.1)
- Admin notifications panel — All tab: "No notifications" (Test 7.1)
- Admin notifications panel — Needs Action tab: "No notifications" (Test 7.1)
- Admin dashboard showing submission visible (Test 7.1)
- Requester submission created 7.2 — "Submission created successfully"
- Admin bell — badge "1" (Test 7.2)
- Admin notifications All tab — "New Submission for Approval" (Test 7.2)
- Admin notifications Needs Action tab — same notification (Test 7.2)
