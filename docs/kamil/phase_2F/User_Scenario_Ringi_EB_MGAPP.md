**USER SCENARIO DOCUMENT**

Ringi (Approval Request) Workflow \- EB-MGAPP

| Document Type | User Scenario Document |
| :---- | :---- |
| **Product** | EB-MGAPP \- Ringi Workflow |
| **Audience** | Developer Team |
| **Version** | v1.1 |
| **Date** | March 2026 |
| **Total Scenarios** | 18 Scenarios across 4 Roles |

# **1\. Purpose & Overview**

This document defines user scenarios for the Ringi (Approval Request) Workflow in EB-MGAPP. Each scenario describes the step-by-step flow from the perspective of each role, along with developer implementation notes and the specific permissions required.

This document is intended as a developer reference to understand what each role can do, when, and under what constraints.

## **Role Summary**

| Role | Japanese Name | Description |
| :---- | :---- | :---- |
| **Requester** | 依頼者 (Requester) | Creates and submits ringi. Can edit own drafts, check status. Workflow features only. |
| **Approver** | 閲覧のみ (View Onlyt) | Reviews and approves assigned ringi. Can send back or reject. Acts as first-stage approver. |
| **Accounting (AIC)** | 経理・内部統制 | Final-stage approver. Views all submissions, lead time reports, send-back rate reports, audit log. |
| **Administrator** | 管理者 (Direktur) | Full access. Configures routes, proxy approves, cancels approvals, manages members and settings. |

# **2\. Submission Status Reference**

The following statuses are used throughout the ringi workflow. Developers should implement these as an enum in the State entity.

| Status (EN) | Japanese | Description |
| :---- | :---- | :---- |
| **Draft** | 下書き | Saved but not yet submitted. Editable by requester. |
| **Pending Approval** | 承認待ち | Submitted and awaiting approval at current stage. |
| **Need Revision** | 修正が必要です | Returned to requester for revision. Requester can edit and resubmit. |
| **Rejected** | 却下 | Rejected by approver. Terminal state unless Admin converts to remand. |
| **Approved** | 承認 | All approval stages completed. Attachments become tamper-proof. |
| **Expired** | 期限切れ | No action taken within the configured deadline. System sets this status. |

# **3\. Requester Scenarios**

| Requester | 依頼者 \- Requester  Can submit, edit own drafts, track own status, comment on assigned submissions |
| :---: | :---- |

|  | Scenario 1  Standard submission Steps Log in to the system → open ringi submission form from chat or dashboard Select category (Purchasing / Expenses / Contract) and the corresponding category\_type (e.g. IT, Marketing, Travel) Fill in required fields: subject, amount (tax-inclusive or exclusive), vendor/counterparty, purpose, budget code, project code, desired approval date Attach supporting documents Submit → system evaluates approval route based on category, category\_type, amount, and requester role Status changes to "Pending Approval" \- notifications sent to first approver Track submission status on dashboard until final approval is received Permissions Required Create & submit ringi   Save as draft   Track submission status (own only) |
| :---- | :---- |

|  | Scenario 2  Save and continue later (draft) Steps Open ringi form → fill in partial information Click Save as Draft → submission saved with status "Draft" Return later → open draft from dashboard → resume editing Complete all required fields and attachments Submit → status changes to "Pending Approval" OR  Return later via AI chat → type a request such as *"find my draft"* or *"show my drafts"* → AI retrieves and surfaces the draft → open directly from chat response → resume editing Complete all required fields and attachments Submit → status changes to "Pending Approval"  Permissions Required Save as draft   Edit own draft (before submission only) |
| :---- | :---- |

|  | Scenario 3  Revision requested \- resubmit Steps Receive notification via email or Slack \- submission has been sent back by approver Open assigned submission → read revision notes provided by approver Edit the submission \- update fields, replace attachments if needed Resubmit → approval chain restarts from step 1 Track status until final approval Permissions Required View assigned submissions   Edit own draft   Create & submit ringi |
| :---- | :---- |

|  | Scenario 4  Add comment on assigned submission Steps Submission has been sent back for revision \- it is now routed back to requester Open the assigned submission from dashboard or notification Review the revision notes left by the approver Add a comment to clarify or respond to the approver's notes \- e.g. explaining a change made Comment is saved and visible to the approver on next review Edit the submission fields as needed and resubmit Developer Note Requester can only add comments on submissions currently assigned/routed to them \- i.e. submissions in Sent Back status returned to their queue. Requester cannot comment on in-progress submissions being reviewed by an approver. Comment is linked to the ringi ID and stored with actor\_id, timestamp, and comment\_text. Visible in approval history timeline. Permissions Required Add comments on ringi (assigned only)   View assigned submissions |
| :---- | :---- |

# **4\. Approver Scenarios**

| Approver | 閲覧のみ \-  (View Only / Approver)   Can approve, send for revision, or reject assigned ringi only |
| :---: | :---- |

|  | Scenario 1  Approve assigned ringi Steps Receive notification via email or Slack DM \- assigned ringi requires review Open ringi from notification link or notification center Review key details: subject, amount, counterparty, due date, progress bar, etc Preview attachments inline (PDF / images) \- check supporting documents View approval history timeline to understand current stage Click Approve → add optional comment → confirm action System routes ringi to next approval stage (AIC) and sends notification Permissions Required View assigned submissions   Approve ringi   Add comments on ringi |
| :---- | :---- |

|  | Scenario 2  Send for revision (remand) Steps Open assigned ringi \- identify an issue (incorrect amount, missing document, wrong vendor) Click "Send for Revision" → revision note text field appears (required) Write detailed revision notes explaining exactly what needs to be corrected Submit → status changes to "Need Revision"  System sends notification to requester with the revision notes Requester edits and resubmits \- approval chain restarts from step 1 Permissions Required Send for revision   Add comments on ringi   View assigned submissions |
| :---- | :---- |

|  | Scenario 3  Reject ringi Steps Open assigned ringi \- determine the submission cannot be approved Click Reject → rejection reason text field appears (required) Write rejection reason clearly explaining why the submission was rejected Confirm rejection → status changes to "Rejected"  Requester is notified of rejection with the reason provided Flow is closed \- no further actions possible from this state Permissions Required Reject ringi   Add comments on ringi   View assigned submissions |
| :---- | :---- |

|  | Scenario 4  Escalation \- timeout scenario Steps Ringi is assigned to approver \- XX-hour reminder notification sent by system XX-hour (based on the escalation time set by administrator) reminder sent \- approver still has not responded System auto-escalates to Administrator after configured timeout period Administrator receives escalation notification via email / Slack Administrator reviews and takes action (approve, proxy, or re-route) Approval chain continues from the escalation point Permissions Required View assigned submissions (assigned only) |
| :---- | :---- |

# **5\. Accounting & Internal Controls Scenarios**

| AIC | 経理・内部統制 \- Accounting & Internal Controls   Can approve all submissions, view reports, export audit log |
| :---: | :---- |

|  | Scenario 1  Final approval stage Steps Receive notification \- ringi routed to AIC after Approver has approved Open submission → review full details: subject, amount, counterparty, purpose Check approval history timeline \- confirm prior stages are all completed Cross-check amount against budget\_code and project\_code Review attachments \- verify supporting documents are valid and complete Approve (or send for revision if issues found) If approved → system sets status to "Approved", stores ringi PDF and attachments in S3 with metadata Permissions Required View all submissions   View assigned submissions   Approve ringi   Send for revision   Add comments on ringi |
| :---- | :---- |

|  | Scenario 2  Reporting \- lead time & send-back rate Steps Access reporting dashboard from the main navigation Review lead time report \- average time from submission to final approval per category, department, or approver Identify bottleneck approvers or stages with consistently high lead times Review send-back rate report \- frequency of revisions per category or department Flag recurring submission issues for process improvement Share report findings with Administrator for route reconfiguration if needed Permissions Required View lead time report   View send-back rate report |
| :---- | :---- |

|  | Scenario 3  Audit response \- export log Steps Auditor (internal or external) requests documentation for specific submissions Open search on dashboard page → filter by: ringi ID, subject, requester, department, amount range, status, date range Review submission details and approval history timeline Export audit log as CSV/Excel  Provide exported data to auditor as compliance evidence OR Open AI chat → type request such as: *"find all approved purchasing submissions above ¥5,000,000 in Q1 2026"* or *"show me ringi submitted by \[requester\] in January"* AI queries submissions matching the criteria and returns results as a list in chat Review results in chat — click into individual ringi to view full details and approval timeline Ask AI to export: *"export these results as audit log CSV"* → AI generates and provides download link Provide exported data to auditor as compliance evidence  Developer Note Audit log retained for 7 years by default (configurable).  Permissions Required View all submissions   Export audit log   View lead time report   View send-back rate report |
| :---- | :---- |

|  | Scenario 4  AIC submits ringi (routed directly to Administrator) Steps Log in → open ringi submission form from chat or dashboard Select category and category\_type (e.g. category \= Purchasing, category\_type \= IT) Fill in required fields: subject, amount, vendor, purpose, budget code, project code, desired approval date Attach supporting documents Submit → system evaluates approval route based on category, category\_type, amount, and requester role System detects requester role \= AIC → skips Approver/View Only stage automatically Submission is routed directly to Administrator for approval AIC receives notification when Administrator approves, sends for revision, or rejects Permissions Required Create & submit ringi Save as draft Track submission status (own only) Add comments on ringi (assigned only) |
| :---- | :---- |

# **6\. Administrator Scenarios**

| Admin | 管理者 \- Administrator (Director)   Full access \- configure routes, proxy approve, cancel, manage members |
| :---: | :---- |

|  | Scenario 1  Configure approval routes Steps Open Settings → Approval Routes → Create New Route Define steps \- assign approvers per step by member name/email or role/department Set logic per step: AND (all must approve) / OR (any one approves) / Parallel (simultaneous) / Threshold (min N of M) Set conditions for route branching: by category, category\_type, amount threshold, requester role Set escalation timeout rule \- e.g. auto-escalate to Admin after 2 days without response Run test send to verify route assigns correctly across all conditions Save and activate route \- applies to all new submissions matching the conditions Developer Note Routes editable via admin UI or CSV import. Max 15 approval stages per route. Up to 30 auto-selection rules per form. Conditions are combinable with AND logic (role AND amount AND category). Condition OR is not supported at route level. Route changes take effect for new submissions only \- in-flight submissions use the route assigned at time of submission. Permissions Required Create & edit approval routes   View approval route configuration   Configure conditional routing   Set escalation timeout rules |
| :---- | :---- |

|  | Scenario 2  Set proxy approver Steps Approver is absent (e.g. on leave) \- ringi is blocked at their stage Open Settings → Approval Routes & Proxy Approval → Proxy Approval tab Specify who is being replaced and who the proxy is Set scope: period (start/end date), submission types, amount ceiling Save proxy configuration \- proxy takes effect immediately Proxy approver receives notifications for all submissions originally assigned to the absent approver Permissions Required Set proxy approver   Proxy approve |
| :---- | :---- |

|  | Scenario 3  Proxy approve any ringi Steps Identify blocked ringi \- approver unavailable or escalation triggered Open the ringi directly from admin dashboard or notification Review submission details Click Proxy Approve → add comment noting proxy action Confirm \- system records action as proxy approval by Admin on behalf of original approver Ringi advances to next stage in the approval chain Permissions Required Proxy approve   View all submissions   Add comments on ringi |
| :---- | :---- |

|  | Scenario 4  Cancel approval Steps A ringi was approved incorrectly \- e.g. wrong amount was approved, wrong approver acted Open the approved ringi from admin dashboard Click Cancel Approval → provide reason (required) System resets approval status \- ringi returns to appropriate stage for re-approval All affected approvers & requester are notified of the cancellation Ringi re-enters the approval chain from the cancelled stage Permissions Required Cancel approval   View all submissions |
| :---- | :---- |

|  | Scenario 5  Convert rejection to remand Steps A ringi was rejected by mistake or circumstances have changed Open the rejected ringi from admin dashboard Click Convert to Remand → provide reason (required) Status changes from Rejected to Need Revision Requester is notified \- they can now edit and resubmit the ringi Approval chain restarts from step 1 upon resubmission Permissions Required Convert rejection to remand   View all submissions |
| :---- | :---- |

|  | Scenario 6  Member management & system configuration Steps Invite new user → assign role (Requester / Approver / AIC) \- cannot invite a role higher than own level Configure expense categories: add/edit purchasing\_type, expenses\_type, contract\_type values Set submission restrictions \- budget limits and application constraints per category Configure notification settings: channels (email / Slack), reminder frequency, escalation rules Permissions Required Manage members & invite users   Manage roles & permissions   Configure expense categories   Configure submission restrictions   Manage notification settings |
| :---- | :---- |

