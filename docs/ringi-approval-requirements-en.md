# Ringi Approval Flow Implementation Requirement Definition Document v0.2

Using freee's Ringi (Request for Approval) flow as a benchmark, these requirements outline the implementation of chat-based Ringi creation, approval, and audit trail management in the current AI file management agent (hereinafter "this system"). No system integration with freee will be performed.

## 1. Purpose and Goals

- Complete the process from Ringi initiation to approval and completion within this system, achieving controls and audit trails equivalent to freee.
- Seamlessly connect the chat/file management experience with Ringi to reduce missing requests and approval delays.
- Provide history and access controls capable of withstanding audits and internal controls.

## 2. Scope

- Target: Initiation, approval, send-back, rejection, deputy approval, and management of approved Ringi (purchasing, contracts, expenses, etc.).
- Interface: Existing Web search/chat UI and email/Slack notifications.
- Out of Scope: External integration with systems like freee (benchmark only), new workflow engine development (using existing n8n configuration), electronic signatures.

## 3. Related Systems and Prerequisites

- This System: Next.js front-end + API/Worker + n8n (workflow/notifications) + Google Drive integration.
- Authentication/Permissions: SSO via OIDC (internal ID infrastructure). Roles such as "Administrator/Approver/Initiator/Viewer" are managed within this system.

## 4. Personas and Roles

- Initiator: Create, attach, and submit Ringi; check and modify status.
- Approver: Approve, reject, or send back requests; input comments. Deputy approval is available (with time/scope limitations).
- Administrator: Define workflows, change approval routes, management of permissions, export audit trails.
- Accounting/Internal Control: Output reports for approval lead time and send-back rates; handle audit responses.

## 5. Business Flow (Overview)

1. Initiator opens the Ringi initiation form via chat commands like `/ringi` or UI buttons.
2. Enter required items and attach files (contracts, quotes, etc.). Save to this system as a draft upon saving.
3. Workflow engine (n8n) determines the approval route based on department, amount, and category, then notifies approvers via email/Slack.
4. Approvers approve, reject, or send back from the chat card or approval screen. Comments are mandatory for send-backs and rejections.
5. Status is centrally managed in this system. Upon approval completion, the final Ringi PDF and attachments are stored in S3, making metadata searchable.
6. All operation logs (who, when, from where, what) are saved as events for auditing. Reports can be generated and exported.

## 6. Functional Requirements

- Initiation and Editing
  - Ringi forms (Categories: Purchasing, Contracts, Expenses, Miscellaneous, etc.).
  - Required fields: Subject, amount (tax included/excluded), payment terms, vendor/counterparty, purpose, period, budget code, related project, desired approval date.
  - File attachments: Quotes, contracts, and related materials. Uses the same UI and naming conventions as the existing upload function.
  - Autofill assistance: Input context in chat → Summarize to generate initial form values.
- Approval Route Determination
  - Route mapping based on amount, department, and category (via configuration file). e.g., amounts over 1 million yen: Manager → General Manager → Accounting.
  - Deputy approval settings (period, approval limit, target departments).
  - Exception routes: Emergency Ringi (shortcut route, post-approval required).
- Approval Operations
  - Statuses: Draft / Applying / Waiting for Approval (by stage) / Sent Back / Rejected / Approved / Expired.
  - Reason comments are mandatory for send-backs and rejections. Difference notes for re-applications.
  - Deadline reminders: Notifications to pending approvers at 24h/72h. Escalation to higher-level approvers if the deadline is exceeded.
  - Attachment preview and download from the approval screen. To prevent tampering, attachments cannot be swapped after approval (must re-apply as a new version).
- Notification and Chat Integration
  - Send approval requests, reminders, send-backs, and completion notifications via email/Slack DM. One-click approval/send-back from chat cards.
  - Display the number of pending items in the in-system notification center.
- Search and Reference
  - Filter and search by Ringi ID, subject, applicant, department, amount range, period, and status.
  - Approval history timeline (who did what and when).
  - Cross-search using linked file metadata (DocType, counterparty, period).
- Reports and Dashboards
  - Approval lead time, send-back rate, count by category, and approval delay rankings.
  - Monthly/quarterly CSV export (for auditing) including IP, user, and operation type.
- Permissions and Security
  - Initiators can only edit/view their own Ringi. Approvers only operate on assigned cases. Administrators can view all and change settings.
  - Attachments cannot be tampered with after approval (hash storage). Access is role-based with tenant isolation.
  - Audit logs (operations, field changes, attachment viewing) are written to a tamper-proof area.
- Exception Handling
  - Offline approval (alternative if email links are unusable: deputy registration in the management screen).
  - Provisional approval for emergencies (mandatory formal post-approval with a set deadline).

## 7. Non-functional Requirements

- Availability: 99.9% during business hours. Targets: Approval operations within 3 seconds, list search within 5 seconds.
- Reliability: Retry/delay notifications for failures. Idempotent keys to prevent duplicate submissions.
- Security: OIDC/SAML SSO, TLS 1.2+, viewing restrictions based on sensitivity tags. IP restrictions (internal/zero-trust).
- Auditing: 7-year retention (adjustable to audit/legal requirements). Exportable audit logs.
- Privacy: Minimization of personal data. Masking options for amount display in chat.

## 8. Data Items (Primary)

- Ringi: id, title, category, amount_tax_excl, tax, amount_tax_incl, currency, vendor, purpose, start_date, end_date, payment_terms, budget_code, project_code, requester_id, department, created_at, desired_approval_date
- State: status, step_order, current_approver_ids, next_approver_ids, due_at, escalated_to, rejection_reason, sendback_reason
- Attachments: file_id, s3_object_key, hash, version, created_by
- Benchmark Reference: Mapping table for freee steps/permissions (no external integration, for gap review).
- Auditing: actor_id, action, target_type, target_id, diff_json, ip, user_agent, occurred_at

## 9. UI/UX Requirements

- Open the initiation form via modal/drawer from chat. Validation for required fields and progress guards.
- Approval cards (chat/notifications) display key items (subject, amount, counterparty, deadline) and "Approve/Send Back/Comment" buttons.
- Visualize stages with status badges and progress bars. Display remaining time until reminders.
- Attachment preview (PDF/images). Toggle between versions with tabs.
- Accessibility: Keyboard operation support, color-blind friendly palettes, approval operations possible on mobile.

## 10. Operation and Management Requirements

- Approval route settings can be CSV-imported/edited in the management screen. Test transmission function to verify routes.
- Notification for downtime/maintenance and application suspension mode. Requests sent during downtime are queued.
- Automatic generation and delivery of monthly/quarterly reports (to accounting/internal control).
- Backup/DR: Daily backups of Ringi data, logs, and attachments. Targets: RPO <= 24h, RTO <= 4h.

## 11. Migration Requirements

- If legacy Ringi data needs to be imported, define scope and format (reference freee's design). Maintain ID mapping to prevent broken links. Verify consistency for 30 days after migration.
- Prepare getting started guides and FAQs for end users. Distribute short manuals (2-3 pages) for approvers.

## 12. Risks and Mitigation

- Gap with Benchmark: Periodically review differences from the freee flow and plan necessary improvements.
- Approval Delays: Dashboard for SLA/lead times and define escalation rules.
- Permission Inconsistency: Automatically run weekly checks for role configuration discrepancies.
- Audit Requirements: Confirm required items, retention periods, and anti-tampering methods for operation logs with the audit representative.

## 13. Pending Matters (TBD)

- Scope of approval steps/governance items adopted from freee benchmark.
- Specific values for amount thresholds and department-specific routes; conditions for emergency Ringi.
- Rules for deputy approval (period, scope, limit).
- Application of attachment encryption and external sharing policies.
- Audit log storage location (internal SIEM/external storage) and format.
