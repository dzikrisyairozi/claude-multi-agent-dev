# File Management AI Agent — Specification v1.0

## 0. Executive Summary

A **File Management AI Agent** that accepts files via a chat UI (drag & drop), automatically classifies them, enriches metadata, improves searchability, applies access control, and optimally stores them in Google Drive.
Future support includes enabling the same operations from Slack and LINE, using low-code orchestration powered by **n8n** for fast development and operations.

> In one sentence: **“You throw in a file — it becomes a file you can actually find later.”**

---

## 1. Purpose & Goals

* **Purpose**: Users simply upload files, and AI understands the content, then organizes, names, stores, indexes, and retrieves them intelligently.
* **Business Goals**

  * Reduce file search time by **50%+**
  * Auto-enforce company file naming and classification standards
  * Provide a unified experience across channels (**Web → Slack/LINE**)

---

## 2. Scope

### ✅ In Scope (MVP)

* Web-based chat UI with drag & drop upload
* Auto classification, naming, tagging (LLM + rule-based logic)
* Auto storage in Google Drive (folder strategy + custom properties)
* Natural language search → candidate suggestions → instant open
* Basic access control (user/workspace level)
* Workflow automation via n8n (audit log, notifications, retry on failure)

### 🚫 Out of Scope (Future)

* DLP auto-policy and data masking
* Digital signatures & document approval workflows
* Advanced versioning (diff visualization)

---

## 3. Target Users / Personas

* **General Staff**: Wants to “just upload and search later.”
* **IT/Admin**: Needs centralized rules, audits, and access control.
* **Management**: Wants visibility across projects and quick access to latest documents.

---

## 4. Key Use Cases

1. Upload a contract PDF → Extract contract type, partner, period → Auto name/tag → Store in `Legal/Contracts` folder → Query: *“Expiring contracts with Company A”*
2. Upload meeting minutes (docx) → Extract participants, date, decisions → Store by project/date → Query: *“What was decided in yesterday’s meeting?”*
3. Upload scanned image (jpeg/png) → OCR → Extract data → Tag → Make searchable

---

## 5. Functional Requirements

### 5.1 File Ingestion

* Drag & drop or file picker, multiple files, size limits configurable
* Supported formats: `pdf, docx, xlsx, pptx, csv, txt, md, jpg, png, heic, zip` (text extraction inside ZIP is future)
* Character encoding support, OCR (built-in or external)

### 5.2 Analysis & Metadata Extraction

* Extract title, summary, keywords, confidentiality level, partner, dates, etc. via LLM
* Support rule-based extraction (e.g., invoice templates, contracts)
* Custom dictionary support (internal keywords, project codes)

### 5.3 Classification, Naming & Storage

* **File name format**:
  `<YYYYMMDD>_<DocType>_<ProjectOrCounterparty>_<ShortTitle>_v1`
* **Folder strategy**:

  * `/Workspace/<Domain>/<Project>/<DocType>/`
    or
  * `/Company/<Dept>/<Project>/...`
* Save metadata in Google Drive **Custom Properties**

### 5.4 Search & Recommendations

* Natural language query → **Metadata + vector search** (RRF fusion)
* Filters: Recency, owner, unread, due date, etc.
* Previews and one-click open (Drive link)

### 5.5 Chat Experience

* Web UI (Next.js + shadcn/ui)
* Slash command support: `/upload`, `/find`, `/pin`
* Result cards: title, summary, tags, actions (Open / Share / Pin)

### 5.6 Permissions / Sharing

* Workspace (tenant) isolation
* User roles (Admin, Editor, Viewer)
* Sync with Drive ACL (least-privilege)

### 5.7 Auditing & Logs

* Track upload, classification, search, open, download, share
* Slack alerts via n8n on failure or manual review required

---

## 6. Non-functional Requirements

| Category     | Target                                                              |
| ------------ | ------------------------------------------------------------------- |
| Availability | 99.9% during business hours                                         |
| Performance  | 5–10s average classification per file (parallel processing)         |
| Security     | OAuth2/OIDC, TLS 1.2+, secret manager (Vault/SSM), PII minimization |
| Scalability  | Enable future connectors (Slack, LINE, Box, Dropbox)                |
| Operations   | Full observability (logs, metrics, alerts), n8n workflow monitoring |

---

## 7. System Architecture (MVP)

* **Frontend**: Next.js App Router + shadcn/ui + Dropzone
* **API**: FastAPI or Node (Express)
* **Workers**: File processing, embeddings, Drive upload
* **Metadata DB**: MySQL 8 or PostgreSQL
* **Vector DB**: Qdrant / Weaviate / pgvector
* **Storage**: Temporary S3-compatible bucket
* **External**: Google Drive API, OAuth2, n8n

```
[Web UI] → [API] → [Queue] → [Worker] → (LLM/OCR) → [Vector DB]
                                    ↘ → [Google Drive] (Storage + ACL + Properties)
```

---

## 8. Data Model (Summary)

| Table         | Fields                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| files         | id, tenant_id, drive_file_id, name, mime, size, checksum, created_at                                 |
| file_metadata | file_id, title, summary, keywords[], doc_type, project, counterparty, date, sensitivity, custom_json |
| embeddings    | file_id, chunk_id, vector, text, page, section                                                       |
| events        | id, type, actor_id, file_id, payload_json, created_at                                                |
| users         | id, tenant_id, role, oauth_provider, oauth_sub, email                                                |
| tenants       | id, plan, settings_json                                                                              |

> Design policy: prioritize future flexibility, enforce integrity via application logic not heavy foreign keys.

---

## 9. Classification & Naming Workflow

1. LLM generates candidate metadata
2. Rule engine overrides LLM when rules exist (Rules > LLM)
3. Apply naming template + duplication handling
4. Upload + apply Drive custom properties

Example **DocTypes**:
`Contract, Invoice, Quotation, Meeting Notes, Specification, Proposal, Technical Doc, Design, Image, Other`

---

## 10. Search Logic

* Convert query into structured filters (date, partner, doc type, owner, etc.)
* Hybrid search: **Vector (semantic)** + **Metadata (exact filters)**
* **RRF (Reciprocal Rank Fusion)** → return top-N results as cards

---

## 11. Google Drive Integration

* OAuth2 (minimum required scopes, token refresh)
* Tenant root folder isolation
* Custom properties:
  `app:doc_type`, `app:project`, `app:counterparty`, `app:date`, `app:keywords`
* Return WebViewLink in chat result card

---

## 12. n8n for Workflow Orchestration

### 12.1 Responsibilities

* Post-ingestion hook → audit → auto retry
* Approval routing (e.g. high-confidential file → Slack notice)
* Scheduled tasks (orphan file detection, duplicate detection, expiry alerts)

### 12.2 Sample Workflow

1. Webhook `/wf/file.ingested`
2. Function (route based on metadata)
3. Google Drive update/move
4. If failure → Slack or Email
5. Wait + Retry (exponential backoff)
6. Store audit event

### 12.3 Node Examples

* Trigger: Webhook, Cron
* Apps: Google Drive, Slack, Gmail
* Utilities: Function, IF, Switch, HTTP Request
* Control: Wait, Error Trigger, Set

> LLM processing sits in API/Worker, not n8n, to avoid vendor lock-in.
> n8n handles orchestration, retries, and notifications.

---

## 13. APIs

| Endpoint                      | Description                       |
| ----------------------------- | --------------------------------- |
| `POST /api/files`             | Upload file → returns `upload_id` |
| `POST /api/files/{id}/ingest` | Trigger analysis (async)          |
| `GET /api/search?q=&filters=` | Search                            |
| `GET /api/files/{id}`         | Metadata + Link                   |
| `POST /api/chat`              | Chat search                       |
| `POST /wf/file.ingested`      | Webhook for n8n                   |

Auth: OAuth2/OIDC (e.g., Auth0)

---

## 14. Security & Compliance

* Least privilege (Drive scopes, app roles)
* Restrict external sharing based on sensitivity tags
* Audit logs protected from tampering
* Retention & deletion policy (Right to be Forgotten)

---

## 15. Monitoring & Ops

* Metrics: latency, failure rate, misclassification rate, search CTR
* Alerts: failure >2%/5min, latency >30s, expired tokens
* Runbook: retry via n8n, manual approval queue

---

## 16. UI Requirements

* Chat + large drag-drop zone
* Result cards (thumbnail, summary, tags, actions)
* Quick filters (date, doc type, owner, partner)
* Dark mode + i18n (ja/en)

---

## 19. Risks & Mitigations

| Risk              | Mitigation                             |
| ----------------- | -------------------------------------- |
| Drive API limits  | Queue + exponential backoff + batching |
| Misclassification | Human feedback loop + review UI        |
| Access mismatch   | Scheduled ACL reconciliation           |

---

## 20. LLM Prompt (Reference)

```
You are a corporate document metadata extractor.
Return in Japanese:
- Title (<=50 chars)
- Summary (3 sentences)
- DocType (Contract / Invoice / Quotation / Meeting Notes / Specification / Proposal / Technical Doc / Design / Image / Other)
- Counterparty/Project/Date/5 keywords
- Sensitivity (Low/Medium/High)
```

---

## 22. Future Slack / LINE Expansion

| Platform | Plan                                                        |
| -------- | ----------------------------------------------------------- |
| Slack    | Slash commands `/find`, event subscription, bot token OAuth |
| LINE     | Messaging API, upload via rich menu, auth delegated to Web  |

---