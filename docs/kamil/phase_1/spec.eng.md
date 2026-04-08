# File Management AI Agent — Specification v1.0

## 0. Executive Summary

A **File Management AI Agent** specification: files submitted via drag & drop through a chat UI are automatically sorted, enriched with metadata, made highly searchable, placed under access control, and optimally stored in Google Drive.
In the future, the same operations will be available from Slack and LINE, with **n8n**-powered low-code orchestration enabling rapid development and operations.

> In a nutshell: An agent that turns "the file you tossed in" into "a file you can actually find later."

---

## 1. Purpose & Goals

* **Purpose**: Users simply drop files in, and the AI understands the content — then organizes, names, stores, indexes, and presents them intelligently.
* **Business Goals**

  * Reduce document search time by **50% or more**
  * Automatically enforce company-standard file naming and classification rules
  * Deliver a consistent experience across multiple channels (**Web → Slack / LINE**)

---

## 2. Scope

* **In Scope (MVP)**

  * Web chat UI (with drag & drop upload)
  * Automatic classification, naming, and tagging (LLM + rule-based)
  * Automatic storage in Google Drive (folder strategy + custom properties)
  * Natural language search from chat → candidate display → instant open
  * Basic access control (per-user / per-workspace)
  * Workflow automation via n8n (audit logs, notifications, failure retry)

* **Out of Scope (Future)**

  * Automatic DLP policy enforcement and data masking
  * Digital signatures and document approval workflows
  * Advanced version management (diff visualization)

---

## 3. Target Users / Personas

* **General Staff**: "Just let me throw it in and find it later — that's all I need."
* **IT / Information Management**: Centralized classification rules, audit logs, access control consistency.
* **Management**: Cross-project overview and quick access to the latest documents.

---

## 4. Key Use Cases

1. Drag & drop a contract PDF → Extract "contract type / counterparty / term" → Auto-name and tag → Store in `Legal/Contracts` folder → Search via chat: *"Contracts with Company A nearing renewal"*
2. Drop in meeting minutes (docx) → Extract participants / date / key decisions → Store by project/date → Answer: *"What was decided in yesterday's meeting?"*
3. Upload an image/scan (jpeg, png) → OCR → Extract key items → Tag → Make searchable

---

## 5. Functional Requirements

### 5.1 File Ingestion

* Drag & drop or file picker; multiple files at once; max size configurable per environment
* Supported extensions: `pdf, docx, xlsx, pptx, csv, txt, md, jpg, png, heic, zip` (text extraction within ZIP is a future item)
* Character encoding handling and OCR (built-in or external)

### 5.2 Analysis & Metadata Extraction

* Use LLM to extract title, summary, keywords, confidentiality level, counterparty, dates, etc.
* Combine with regex / rule engine (e.g., contract patterns, invoice patterns)
* Custom dictionary support (company-specific terms, project codes)

### 5.3 Classification, Naming & Storage

* **Naming convention (example)**: `<YYYYMMDD>_<DocType>_<ProjectOrCounterparty>_<ShortTitle>_v1`
* **Folder strategy**: `/Workspace/<Domain>/<Project>/<DocType>/` or `/Company/<Dept>/...`
* Store metadata in Google Drive **Custom Properties** (improves searchability)

### 5.4 Search & Recommendations

* Natural language query → **Metadata search + Vector search** (fused via RRF or similar)
* Filters: "Recent", "Assigned to", "Unread", "Due date", etc.
* Candidate preview and instant open (direct Drive link)

### 5.5 Chat Experience

* Web UI dialog (built on Next.js + shadcn/ui)
* Slash-command-style helpers (`/upload`, `/find`, `/pin`, etc.)
* Result cards: title, summary, tags, actions (Open / Share / Pin)

### 5.6 Permissions / Sharing

* Workspace (tenant) isolation
* User roles (Admin, Editor, Viewer)
* Sync with Drive-side ACL (least privilege)

### 5.7 Logging / Auditing

* Event logs for: ingestion, classification, viewing, search, download, sharing
* Slack notifications via n8n on failure or when manual review is required

---

## 6. Non-Functional Requirements

* **Availability**: 99.9% during business hours
* **Performance**: Average 5–10 seconds per file for initial classification (assumes parallel processing)
* **Security**: OAuth2/OIDC, TLS 1.2+, PII minimization, secrets management (Vault / SSM)
* **Extensibility**: Support for additional connectors (Slack / LINE / Box / Dropbox, etc.)
* **Operations**: Monitoring (metrics / logs / alerts), workflow visualization (n8n)

---

## 7. System Architecture (MVP)

* **Frontend**: Next.js (App Router) + shadcn/ui + Dropzone
* **API**: FastAPI or Node (Express) — either is acceptable
* **Workers**: Ingestion / analysis / vectorization / Drive storage
* **Metadata DB**: MySQL 8 or PostgreSQL (tenants, metadata, jobs)
* **Vector DB**: Qdrant / Weaviate / pgvector (any one of them)
* **Storage**: Temporary S3-compatible bucket (initial upload staging)
* **External**: Google Drive API, OAuth2, n8n (workflows)

```
[Web UI] → [API] → [Queue] → [Worker] → (LLM/OCR) → [Vector DB]
                                    ↘ → [Google Drive] (Storage / ACL / Properties)
```

---

## 8. Data Model (Summary)

* **files**: id, tenant_id, drive_file_id, name, mime, size, checksum, created_at
* **file_metadata**: file_id, title, summary, keywords[], doc_type, project, counterparty, date, sensitivity, custom_json
* **embeddings**: file_id, chunk_id, vector, text, page, section
* **events**: id, type, actor_id, file_id, payload_json, created_at
* **users**: id, tenant_id, role, oauth_provider, oauth_sub, email
* **tenants**: id, plan, settings_json

> Design policy: Prioritize future flexibility; keep foreign keys minimal (ensure consistency through operational policies).

---

## 9. Classification & Naming Logic (Excerpt)

1. LLM generates **candidates** (title / summary / tags / DocType)
2. Rule engine **finalizes** them (priority: Rules > LLM)
3. Apply naming template and handle duplicates (auto-increment suffix)
4. Move to Google Drive + save custom properties

**Example DocTypes**: Contract, Invoice, Quotation, Meeting Minutes, Specification, Proposal, Technical Document, Blueprint, Image, Other

---

## 10. Search Logic

* Parse the query into **structured components** (time period / counterparty / DocType / assignee, etc.)
* **Vector search** (strong on gist/meaning) combined with **metadata search** (strong on precise filtering)
* **RRF (Reciprocal Rank Fusion)** to merge scores → display top-N results as cards

---

## 11. Google Drive Integration

* **Authorization**: OAuth2 (minimize scopes, token refresh)
* **Storage**: Assign tenant-specific root folders under a predefined root
* **Properties**: `app:doc_type`, `app:project`, `app:counterparty`, `app:date`, `app:keywords`, etc.
* **Links**: Embed WebViewLink in chat result cards

---

## 12. Streamlined Development with n8n

### 12.1 Responsibilities

* Post-ingestion hook → audit log recording → **automatic retry** on failure
* Approval flows (e.g., high-sensitivity file = review required → Slack notification to assignee)
* Scheduled maintenance (orphan file detection, duplicate detection, expiration alerts)

### 12.2 Representative Workflow (Template)

1. **Webhook** (called from API: `/wf/file.ingested`)
2. **Function** (routing based on metadata / sensitivity)
3. **Google Drive** (property update / file move)
4. **If** (failure or approval required)
5. **Slack** (notification) / **Email** (backup)
6. **Wait + Retry** (exponential backoff)
7. **Datastore** (persist audit event)

### 12.3 Example n8n Node Configuration (Excerpt)

* Trigger: Webhook, Cron
* Apps: Google Drive, Slack, Gmail
* Utility: Function, IF, Switch, Merge, HTTP Request
* Control: Wait, Error Trigger, Set

> To avoid vendor lock-in, LLM inference is performed on the API / Worker side as a rule. n8n's role is to "connect, visualize, and retry."

---

## 13. APIs (External / Internal)

* `POST /api/files` — Upload (response includes `upload_id`)
* `POST /api/files/{id}/ingest` — Start analysis (asynchronous)
* `GET /api/search?q=...&filters=...` — Search
* `GET /api/files/{id}` — Retrieve metadata and link
* `POST /api/chat` — Chat query (search / recommendations)
* **Webhook**: `/wf/file.ingested` (for n8n integration)

**Authorization**: OAuth2/OIDC (e.g., Auth0)

---

## 14. Security & Compliance

* Least privilege (Drive scopes, application permissions)
* Sharing restrictions based on PII / sensitivity tags (block external sharing / set expiration)
* Audit log tamper protection (WORM-style preservation or external audit storage)
* Data retention and deletion policy (Right to be Forgotten)

---

## 15. Operations & Monitoring

* **Metrics**: Processing latency, failure rate, misclassification rate, search CTR
* **Logs**: Analysis errors, API failures, Drive API rate limits
* **Alerts**: Failure rate > 2% over 5 min, latency > 30 sec, token expiration
* **Runbook**: Re-execute from n8n, manual approval of pending items

---

## 16. UI Requirements (Web)

* Chat interface + drag & drop zone (generously sized area)
* Result cards (thumbnail / summary / tags / actions)
* Quick filters (time period / DocType / assignee / counterparty)
* Dark mode and i18n (ja / en)

---

## 19. Risks & Mitigations

* **Drive API rate limits** → Batching / exponential backoff / queue control
* **Misclassification** → Human review UI + learning loop (feedback-weighted adjustments)
* **Permission inconsistencies** → Periodic consistency checks (n8n Cron)

---

## 20. Reference Prompt (LLM)

**Metadata Extraction Prompt (Summary)**

```
You are a corporate document metadata extractor. Return the following in Japanese:
- Title (max 50 characters)
- Summary (3 sentences)
- DocType (Contract / Invoice / Quotation / Meeting Minutes / Specification / Proposal / Technical Document / Blueprint / Image / Other)
- Counterparty / Project name / Date / 5 keywords
- Sensitivity (Low / Medium / High)
```

---

## 22. Appendix: Future Slack / LINE Expansion

* **Slack**: Slash Command `/find`, Event Subscriptions, OAuth (Bot Token)
* **LINE**: Messaging API, guide uploads via Rich Menu, delegate authentication to Web
