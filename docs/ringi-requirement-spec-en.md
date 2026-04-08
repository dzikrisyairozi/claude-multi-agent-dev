# Ringi Approval Flow Requirement Specification v0.2

## 1. Purpose and Background

- Integrate the Ringi (Request for Approval) flow into the current AI file management agent to complete Ringi processes starting from chat.
- Use freee's Ringi flow as a benchmark, targeting an equivalent level of control and audit trail (no external system integration).
- Resolve missing Ringi initiations, approval delays, and fragmented history to simplify audit responses.

## 2. Scope

- Target: Ringi initiation, approval, send-back, rejection, deputy approval, and completion/expiration management for purchasing, contracts, expenses, etc.
- Channel: Current Web chat UI, email/Slack notifications.
- Excluded: System integration with freee (benchmark only), new workflow engine development (using existing n8n), electronic signatures.

## 3. Stakeholders and Roles

- Initiator: Create and submit Ringi, modify drafts, check status.
- Approver: Approve, send back, or reject assigned Ringi; input comments. Authorized for deputy approval.
- Administrator: Configure approval routes, manage permissions, output audit logs, manage notifications.
- Accounting/Internal Control: Check reports for lead time and send-back rates, handle audit responses.

## 4. Prerequisites and Constraints

- Authentication: SSO via OIDC/SAML. Roles (Administrator/Approver/Initiator/Viewer) are managed in this system.
- Benchmark: Reference freee's flow and governance for equivalent UX and control (no system integration).
- Tenant Isolation: Follow existing workspace/tenant isolation policies.

## 5. Business Flow Overview

1. Initiator opens the Ringi initiation form via chat, enters required items and attachments, and submits.
2. Approval route is determined by amount, department, and category (managed via config file/admin UI). Approval requests are sent via email/Slack.
3. Approver approves, sends back, or rejects via chat card/approval screen. Comments are mandatory for send-backs and rejections.
4. Status is centrally managed within this system. Completed Ringi PDF and attachments are stored in S3 with metadata.
5. Operation logs are saved and used for search, reports, and exports.

## 6. Functional Requirements

- Initiation
  - Form fields: Subject, Category (Purchasing, Contracts, Expenses, Misc.), Amount (tax incl./excl.), Tax category, Payment terms, Vendor/Counterparty, Purpose, Period, Budget code, Project, Desired approval date, Applicant/Department.
  - Attachments: Quotes, contracts, and related materials. No tampering allowed after approval (must re-apply as a new version).
  - Contextual input assistance: Summarize chat messages to suggest initial form values.
- Approval Routes
  - Configurable approval stages by amount, department, and category (editable via config file/admin screen, CSV import).
  - Deputy approval (period/scope limits, limit amounts), Emergency Ringi route (mandatory post-approval).
- Approval Operations
  - Statuses: Draft / Applying / Waiting for Approval (by stage) / Sent Back / Rejected / Approved / Expired.
  - Reason comments are mandatory for send-backs and rejections. Difference notes for re-applications.
  - Deadline Management: 24h/72h reminders, escalation upon expiration.
  - Attachment preview, tampering detection via hash storage.
- Notification and Chat Integration
  - Approval requests, reminders, send-backs, and completion notifications via email/Slack DM. Approve/send back from chat cards.
  - Display pending count in the notification center.
- Search and Reference
  - Search/filter by Ringi ID, subject, applicant, department, amount range, status, and period.
  - Display approval history timeline. Link attachments on Drive with metadata.
- Reports
  - Dashboard for approval lead time, send-back rate, count by category, and delay rankings.
  - CSV/Excel export (for auditing, including IP/User/Operation).
- Permissions and Security
  - RBAC: Initiators edit/view their own applications, approvers operate on assigned cases, admins view all and change settings.
  - Tenant isolation, Drive access with least privilege. IP restriction options.
  - Audit Logs: Save operation type, before/after differences, IP, User Agent, and timestamp to a tamper-proof area.

## 7. Non-functional Requirements

- Availability: 99.9% during business hours. Response within 3 seconds for approval operations, 5 seconds for searches.
- Reliability: Queue retention and backoff retry for failures. Idempotent keys for deduplication.
- Security: TLS 1.2+, SSO, view control based on sensitivity tags, attachment hash storage. Encryption at rest as needed.
- Auditing/Retention: Ringi data, attachments, and audit logs are retained for 7 years (configurable). Export API/Admin UI.
- Operations: Metrics (lead time, send-back rate, error rate), alert thresholds (e.g., failure rate > 2%/5 min), runbook preparation.

## 8. Data Items (Overview)

- Ringi: id, title, category, amount_tax_excl, tax, amount_tax_incl, currency, vendor, purpose, start_date, end_date, payment_terms, budget_code, project_code, requester_id, department, desired_approval_date, created_at, updated_at
- State: status, step_order, current_approver_ids, next_approver_ids, due_at, escalated_to, rejection_reason, sendback_reason
- Attachments: file_id, s3_object_key, hash, version, created_by, created_at
- Auditing: actor_id, action, target_type, target_id, diff_json, ip, user_agent, occurred_at
- Reference Benchmark: Maintain freee's Ringi step IDs/names in a mapping table (no integration, for gap review).

## 9. UI/UX Requirements

- Open initiation form via modal/drawer from chat. Required field validation, progress guards.
- Approval cards display key items (subject, amount, counterparty, deadline) and buttons (Approve/Send Back/Comment). Progress bar and deadline display.
- Attachment preview (PDF/image) and version display. Mobile-friendly approval operations.
- Accessibility: Keyboard operation, color-blind friendly design, clear error messages.

## 10. Operation and Management Requirements

- Edit/CSV import approval routes in the admin screen. Verify routes with test transmissions.
- Manage notification settings (channels/frequency). Maintenance mode for suspending applications with notice.
- Automatic generation/delivery of periodic reports (accounting/internal control). Daily backups. Targets: RPO <= 24h, RTO <= 4h.

## 11. Migration Requirements

- If legacy Ringi data import is needed, define scope/format (reference freee's design). Perform ID mapping and consistency checks.
- Parallel operation period for consistency checks and user training. Distribute FAQs and short manuals.

## 12. Risks and Mitigation

- Gap with Benchmark: Periodically review differences from freee flow and plan improvements.
- Approval Delays: Reminder/escalation rules and dashboard monitoring.
- Permission Errors: Weekly automated checks for role discrepancies.
- Unconfirmed Audit Requirements: Early agreement with the audit team on required items, retention, and anti-tampering.

## 13. Pending Matters

- Specific values for amount thresholds and department routes; emergency Ringi conditions.
- Rules for deputy approval (period, target, limit).
- Adoption scope of specific approval steps/governance items from freee benchmark.
- Attachment encryption/external sharing policies, audit log destination and format.
