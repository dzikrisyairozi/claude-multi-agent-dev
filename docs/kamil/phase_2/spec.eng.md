# Ringi (Approval Request) Workflow — Requirements Definition v0.2

## 1. Purpose & Background
- Integrate a ringi (approval request) workflow into the existing File Management AI Agent, enabling end-to-end ringi processing initiated from chat.
- Benchmark against freee's ringi approval flow, targeting equivalent governance and audit trail levels (without external system integration).
- Eliminate missed ringi submissions, approval delays, and scattered history — simplifying audit responses.

## 2. Scope
- **Covered**: Ringi submission for purchases, contracts, expenses, etc.; approval, send-back, rejection, proxy approval, completion, and expiration management.
- **Channels**: This system's existing Web chat UI; email and Slack notifications.
- **Excluded**: System integration with freee (benchmark reference only); building a new workflow engine (use existing n8n); digital signatures.

## 3. Stakeholders & Roles
- **Requester**: Creates and submits ringi, edits drafts, checks status.
- **Approver**: Approves / sends back / rejects assigned ringi, enters comments. Has proxy approval authority.
- **Administrator**: Configures approval routes, manages permissions, exports audit logs, manages notifications.
- **Accounting / Internal Controls**: Reviews lead time and send-back rate reports, handles audit responses.

## 4. Assumptions & Constraints
- **Authentication**: SSO via OIDC/SAML. Roles (Admin / Approver / Requester / Viewer) are managed within this system.
- **Benchmark**: Reference freee's flow and governance for equivalent UX and controls, but do not integrate with their system.
- **Tenant Isolation**: Follow the existing workspace/tenant isolation policy.

## 5. Business Flow Overview
1. The requester opens the ringi submission form from chat, fills in required fields and attachments, and submits the request.
2. The approval route is determined by amount / department / category (managed via config files or admin UI). Approval requests are sent via email and Slack notifications.
3. The approver reviews and approves / sends back / rejects via a chat card or the approval screen. Comments are required for send-back and rejection.
4. Status is centrally managed within this system. Upon completion, the ringi PDF and attachments are stored in S3 with metadata applied.
5. Operation logs are saved and used for search, reports, and export.

## 6. Functional Requirements

### Submission
- **Form fields**: Subject, category (purchase / contract / expense / miscellaneous, etc.), amount (tax-inclusive / tax-exclusive), tax classification, payment terms, vendor / counterparty, purpose, period, budget code, project, desired approval date, requester / department.
- **Attachments**: Quotations / contracts / related documents. After approval, attachments are tamper-proof (re-submit with a new version for changes).
- **Context-aware input assistance**: Summarize chat messages and pre-populate form defaults.

### Approval Routes
- Multi-step approval configuration by amount, department, and category (editable via config files or admin UI; CSV import supported).
- Proxy approval (limited by period / scope / amount ceiling); emergency ringi route (post-hoc approval required).

### Approval Operations
- **Statuses**: Draft / Submitted / Pending Approval (per step) / Sent Back / Rejected / Approved / Expired.
- Comments required for send-back and rejection reasons. Diff memo field available when re-submitting.
- **Deadline management**: Reminders at 24h and 72h; escalation on overdue.
- Attachment preview and tamper detection via stored hash.

### Notifications & Chat Integration
- Deliver approval requests, reminders, send-backs, and completions via email and Slack DM. Approve or send back directly from a chat card.
- Notification center displaying the count of pending items.

### Search & Reference
- Search and filter by ringi ID, subject, requester, department, amount range, status, and date range.
- Display approval history as a timeline. Link Drive-stored attachments with their metadata.

### Reporting
- Dashboard: approval lead time, send-back rate, count by category, delay rankings.
- CSV/Excel export (for auditing — includes IP, user, and operation details).

### Permissions & Security
- **RBAC**: Requesters can only edit/view their own submissions; approvers can operate on assigned cases; administrators have full view and configuration access.
- Tenant isolation; least-privilege Drive access. IP restriction option available.
- **Audit logs**: Record operation type, before/after diff, IP, user agent, and timestamp — stored in a tamper-proof area.

## 7. Non-Functional Requirements
- **Availability**: 99.9% during business hours. Approval operations respond within 3 seconds; search within 5 seconds (target).
- **Reliability**: Queue persistence and backoff retry on failures. Idempotency keys to prevent duplicate submissions.
- **Security**: TLS 1.2+, SSO, view control based on sensitivity tags, attachment hash storage. Encrypted storage as needed.
- **Audit / Retention**: Audit logs, ringi data, and attachments retained for 7 years by default (configurable). Export API and admin UI provided.
- **Operations**: Metrics (lead time, send-back rate, error rate), alert thresholds (e.g., failure rate > 2% over 5 min), runbook maintenance.

## 8. Data Items (Overview)
- **Ringi**: id, title, category, amount_tax_excl, tax, amount_tax_incl, currency, vendor, purpose, start_date, end_date, payment_terms, budget_code, project_code, requester_id, department, desired_approval_date, created_at, updated_at
- **State**: status, step_order, current_approver_ids, next_approver_ids, due_at, escalated_to, rejection_reason, sendback_reason
- **Attachments**: file_id, s3_object_key, hash, version, created_by, created_at
- **Audit**: actor_id, action, target_type, target_id, diff_json, ip, user_agent, occurred_at
- **Benchmark reference**: Maintain a mapping table of freee's ringi step IDs / names, etc. (no external integration — for gap review only).

## 9. UI/UX Requirements
- Open the submission form from chat via a modal or drawer. Required field validation and progress guards.
- Approval card showing key items (subject / amount / counterparty / due date) with action buttons (Approve / Send Back / Comment). Progress bar and due date display.
- Attachment preview (PDF / images) with version display. Approval operations must be usable on mobile.
- **Accessibility**: Keyboard navigation, color-blind-friendly palette, clear error messages.

## 10. Operations & Administration Requirements
- Edit approval routes via admin UI or CSV import. Test sends to verify routes.
- Notification settings management (channel / frequency). During maintenance mode, suspend submissions and display a notice.
- Automated periodic report generation and distribution (for accounting / internal controls). Daily backups; RPO <= 24h, RTO <= 4h targets.

## 11. Migration Requirements
- If importing existing ringi data is needed, define scope and format (reference freee's design as a benchmark). Perform ID mapping and consistency checks.
- Establish a parallel operation period; conduct consistency checks and user training. Distribute FAQ / quick-start guide.

## 12. Risks & Mitigations
- **Benchmark gap**: Periodically review differences from the freee flow and plan necessary improvements.
- **Approval delays**: Reminder / escalation rules and dashboard monitoring.
- **Permission misconfiguration**: Automated weekly role diff checks.
- **Unconfirmed audit requirements**: Reach early agreement with the audit team on required fields, retention periods, and tamper-prevention methods.

## 13. Open Items
- Specific amount thresholds and department-level route definitions; conditions for emergency ringi.
- Proxy approval rules (period, scope, amount ceiling).
- Adoption scope for benchmark (freee) approval steps and governance items.
- Attachment encryption / external sharing policy; audit log storage location and format.
