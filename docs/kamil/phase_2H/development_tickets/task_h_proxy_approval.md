# TASK H — 代理承認・エスカレーション / Proxy Approval + Escalation

**Priority**: High
**Assignee**: Syahiid
**Effort**: XL (Extra Large) — New DB tables, new services, escalation cron, complex UI
**Status**: New feature — permission defined but no implementation

---

## Current State

### What Exists:
- `proxy_approve` permission in matrix: Approver (limited), Admin (granted)
- `set_escalation_timeout` permission: Admin only
- `set_proxy_approver` permission: Admin only
- Dashboard has 7 status tabs but **NO Escalations tab**
- `approval_request_step_approvals` tracks step status + `acted_by` + `acted_at`

### What's Missing:
- No proxy approval service or UI
- No escalation timeout mechanism
- No `escalation_timeout_hours` on routes
- No `escalated_at` tracking on steps
- No "Escalations" tab on dashboard
- No cron/edge function for timeout detection

## Figma Design Description

### Escalations Tab (node 2194:46516)
- Dashboard with tabs: All 14 | Pending 3 | Approved 6 | Rejected 5 | Need Revision 2 | **Escalations 2** (orange, highlighted) | Cancelled 2
- Escalated submissions show as red-bordered cards:
  - Title: "20251220_PurchaseRequest_OfficeEquipment_Q4-2025_v1"
  - **"Escalation" badge** (orange tag)
  - **"Escalation Approval Timeout" banner** (red background): "REQ-00002 has exceeded the 48-hour approval window at Stage 2 (AIC Approval). No action was taken by Erika. This submission has been automatically escalated to you."
  - Details: Vendor Name, Total Amount, Category, Priority
  - **Two buttons**: Reject (red, full-width) | Take Action (orange, full-width)
  - Footer: date, file count, "View Details" link

### Proxy Approve Dialog (node 2194:46516)
- Title: "Proxy Approve"
- Subtitle: "REQ-00002 has exceeded the 48-hour approval window..."
- **"You are acting as proxy" box** (pink/red highlight):
  - "You will approve this submission on behalf of **Erika** (Accountant). This action will be recorded in the audit log as a proxy approval by **Rita**."
- **Original Assignee**: Shows Erika with Accountant badge, "No action for 72h"
- Footer: Cancel | Continue (blue)

### Delegate Authority Dialog (node 2194:48614)
- Title: "Give Approver Proxy Approve Authorized"
- Subtitle: Same escalation context
- **Replacing Original Assignee**: Shows Erika (Accountant, "No action for 72h")
- **Assign to** list: Shows eligible approvers with radio selection:
  - "Mita" (Approver badge, "2 Pending Submission")
  - "Gilbert" (Approver badge, "0 Pending Submission")
  - "Michael" (Accountant badge, "1 Pending Submission")
- Footer: Cancel | Continue (blue)

## Implementation Steps

### Step 1: DB Migrations
```sql
-- Escalation config on routes
ALTER TABLE approval_routes
  ADD COLUMN escalation_timeout_hours integer DEFAULT 48;

-- Track escalation on step approvals
ALTER TABLE approval_request_step_approvals
  ADD COLUMN escalated_at timestamptz,
  ADD COLUMN escalation_notified boolean DEFAULT false;

-- Proxy approval records
CREATE TABLE proxy_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_approval_id uuid NOT NULL REFERENCES approval_request_step_approvals(id),
  original_approver_id uuid NOT NULL,
  proxy_approver_id uuid NOT NULL,
  delegated_by uuid NOT NULL,  -- who authorized the proxy
  action text NOT NULL,  -- 'direct_proxy' | 'delegated'
  created_at timestamptz DEFAULT now()
);
```

### Step 2: Escalation Detection Service
Create `src/service/approvalRequest/escalation.ts`:
```typescript
// Called by cron or edge function
async function detectEscalations() {
  // Find step_approvals where:
  //   status = 'pending'
  //   AND created_at + route.escalation_timeout_hours < now()
  //   AND escalated_at IS NULL
  // Mark them as escalated
  // Create notifications for admin users
}

async function getEscalatedSubmissions() {
  // Fetch submissions with escalated steps
  // Return with timeout info, original assignee details
}
```

### Step 3: Proxy Approval Service
Create `src/service/approvalRequest/proxyApproval.ts`:
```typescript
async function proxyApprove(requestId, stepId, proxyUserId, notes) {
  // 1. Verify proxy has permission (APR-005)
  // 2. Process approval as proxy
  // 3. Record in proxy_approvals table
  // 4. Log activity: "proxy_approval" with original + proxy actor
  // 5. Notify requester
}

async function delegateProxyAuthority(requestId, stepId, targetUserId) {
  // 1. Verify delegator has permission (ARC-005)
  // 2. Record delegation in proxy_approvals
  // 3. Notify target user: "You've been given proxy authority"
  // 4. Target user can now act on this specific step
}

async function getEligibleProxyApprovers(stepId) {
  // Return users who can be assigned as proxy
  // Include their pending submission count
}
```

### Step 4: Dashboard Escalations Tab
- Add "Escalations" tab to dashboard (`src/app/page.tsx`)
- Orange/red styling with count badge
- Fetch escalated submissions via `getEscalatedSubmissions()`
- Card layout with escalation banner, timeout info, action buttons

### Step 5: Proxy Approve Dialog
Create `src/components/approval-request/ProxyApproveDialog.tsx`:
- Shows "acting as proxy" warning
- Original assignee info with timeout duration
- Confirm button triggers `proxyApprove()`

### Step 6: Delegate Authority Dialog
Create `src/components/approval-request/DelegateProxyDialog.tsx`:
- Shows original assignee info
- List of eligible approvers with pending count
- Radio selection → Continue triggers `delegateProxyAuthority()`

### Step 7: Route Timeout Config
Add `escalation_timeout_hours` field to approval route edit form:
- Default: 48 hours
- Admin-only setting
- Shows in route detail view

### Step 8: Background Job
Supabase Edge Function or pg_cron:
- Runs every hour
- Calls `detectEscalations()`
- Marks timed-out steps, creates notifications

## Acceptance Criteria

- [ ] Dashboard has "Escalations" tab with count badge
- [ ] Timed-out submissions appear with escalation banner
- [ ] Banner shows: timeout duration, stage name, original assignee
- [ ] Admin can click "Take Action" → Proxy Approve dialog
- [ ] Proxy approval records proxy actor + original assignee in audit log
- [ ] Admin can delegate to another user → Delegate dialog
- [ ] Delegate dialog shows eligible approvers with pending count
- [ ] Delegated user sees submission and can act on it
- [ ] Escalation timeout configurable per route (default 48h)
- [ ] Background job detects timeouts automatically

## Test Scenarios

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Step pending > 48h | Appears in Escalations tab |
| 2 | Admin proxy-approves | Step resolved, logged as proxy |
| 3 | Admin delegates to User B | User B gets notification, can approve |
| 4 | Route has custom 24h timeout | Escalation triggers at 24h |
| 5 | Original approver acts before timeout | No escalation triggered |
| 6 | Non-admin views Escalations | Tab hidden or empty |

## Edge Cases & Gotchas

- **Timing**: Escalation detection is batch (hourly). Actual escalation may lag by up to 1 hour.
- **Original approver acts after escalation**: If original approver finally acts after escalation is shown, the escalation should be cleared.
- **Multiple escalations**: Same submission could have multiple escalated steps. Handle each independently.
- **Proxy chain**: Delegated user might also time out. Consider: can a proxy delegation be re-delegated?

## Code References

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Dashboard tabs to add Escalations |
| `src/service/approvalRequest/approvalRouteMatching.ts` | `processStepApproval()` to extend |
| `src/types/approvalRequest.ts` | Types for escalation fields |
| `src/types/notification.ts` | New notification types |

## Permission Matrix Reference

- APR-005: Proxy approve — Approver (limited), Admin (granted)
- ARC-004: Set escalation timeout rules — Admin only
- ARC-005: Set proxy approver — Admin only

## Dependencies

- **Requires**: Task D (route timeout config), Task E (submissions routed with steps)
- Ship Flow 1 (admin proxy) first, Flow 2 (delegate) second
