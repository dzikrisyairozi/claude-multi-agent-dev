# Phase 2 Ringi — Manual Test Plan

## Test Environment

| | |
|---|---|
| **URL** | https://eb-filemg-development.vercel.app |
| **Date** | February 2026 |
| **Scope** | Key Test Cases — Submission, Approval, AI Chat, AI Retrieval, Status, User Roles |

## Test Credentials

| Role | Email | Use For |
|------|-------|---------|
| Staff / Employee | `staff@gmail.com` | Submitting ringi, AI chat, viewing own submissions |
| Manager | `manager@gmail.com` | Approving/rejecting, viewing all submissions |
| Admin | `superadmin@gmail.com` | Admin panel access |

## Navigation Routes

| Page | URL | Access |
|------|-----|--------|
| Home / Dashboard | `https://eb-filemg-development.vercel.app/` | All roles |
| New AI Chat | `https://eb-filemg-development.vercel.app/` (click "New" in sidebar) | All roles |
| Chat Thread | `https://eb-filemg-development.vercel.app/c/[threadId]` | All roles |
| Files | `https://eb-filemg-development.vercel.app/files` | All roles |
| Activity Log | `https://eb-filemg-development.vercel.app/activity-log` | All roles |
| Approval Detail | `https://eb-filemg-development.vercel.app/approval-requests/[id]` | All roles (view varies by role) |
| Login | `https://eb-filemg-development.vercel.app/login` | Public |
| Admin Dashboard | `https://eb-filemg-development.vercel.app/superadmin/dashboard` | Superadmin only |
| Admin Users | `https://eb-filemg-development.vercel.app/superadmin/users` | Superadmin only |

## Test Files

All test files are in `files_to_submit/`. Upload these during testing as instructed in each test case.

### Valid Ringi Documents (pre-filled)

| File | Lang | Content | Amount |
|------|------|---------|--------|
| `ringi_en_detailed_license_renewal.docx` | EN | Adobe license renewal, Sales dept | $12,500 |
| `ringi_en_form_laptop_purchase.docx` | EN | Laptop procurement, Engineering dept | $6,000 |
| `ringi_en_simple_conference.docx` | EN | Conference attendance, Marketing dept | $2,000 |
| `ringi_en_purchase_monitors.docx` | EN | Dell 4K monitors x5, IT dept | $3,750 |
| `ringi_en_spreadsheet_cloud.xlsx` | EN | AWS cloud migration, Operations dept | $33,600/yr |
| `ringi_jp_purchase_chairs.docx` | JP | オフィスチェア10脚, 総務部 | ¥500,000 |
| `ringi_jp_standard_salesforce.docx` | JP | Salesforce導入, 営業部 | ¥4,100,000 |
| `ringi_jp_formal_server.docx` | JP | サーバー増設, 開発部 | $10,080/yr |
| `ringi_jp_spreadsheet_accounting.xlsx` | JP | freee会計更新, 経理部 | ¥600,000/yr |
| `ringi_jp_legacy_template.doc` | JP | Blank legacy .doc template | — |

### Edge Case Files

| File | Purpose |
|------|---------|
| `edge_beach_image.jpg` | Non-document image (wrong file type) |
| `edge_empty_file.pdf` | Blank PDF with no text |
| `edge_large_file.pdf` | ~340KB multi-page PDF |
| `edge_special_chars_名前.docx` | Japanese characters in filename |

## Submission Form Fields Reference

The submission dialog (accessed via "New Submission" button on dashboard) contains these fields in order:

1. **Submission Category** (button group): `Purchasing` / `Contract` / `Expense` / `Other`
2. **Submission Title** * (text input)
3. **Priority** * (dropdown): `Low` / `Medium` / `High` / `Critical`
4. **Department** * (text input)
5. **Items & Services**: Click "Add Item" → Item Name (text), QTY (number), Price (number)
6. **Enable Tax Calculation** (toggle, only visible for Purchasing category): Tax Rate % (default 10%)
7. **Vendor Name** * (text input)
8. **Payment Schedule Date** * (date picker)
9. **Payment Method** * (dropdown): `Bank Transfer` / `Credit Card` / `Cash` / `Other`
10. **Required by Date** * (date + time picker)
11. **Reason for Purchase** * (textarea)
12. **Purpose** * (text input)
13. **Remarks/Additional Notes** (optional text input)
14. **Attachments** (drag & drop zone, max 20MB/file, up to 10 files)
15. **Estimated Approval Route** (read-only display: Requester → Manager → Accountant)
16. **Cancel** / **Create Submission** buttons

Fields marked with * are required.

## Test Summary

| # | Category | Tests | P1 | P2 | P3 | File |
|---|----------|-------|----|----|-----|------|
| 01 | Submission | 10 | 3 | 5 | 2 | [01_submission.md](./01_submission.md) |
| 02 | Approval | 8 | 3 | 4 | 1 | [02_approval.md](./02_approval.md) |
| 03 | AI Chat | 13 | 4 | 7 | 2 | [03_ai_chat.md](./03_ai_chat.md) |
| 04 | AI Retrieval | 6 | 2 | 4 | 0 | [04_ai_retrieval.md](./04_ai_retrieval.md) |
| 05 | Submission Status | 5 | 2 | 3 | 0 | [05_submission_status.md](./05_submission_status.md) |
| 06 | User Roles | 6 | 4 | 1 | 1 | [06_user_roles.md](./06_user_roles.md) |
| | **Total** | **48** | **18** | **24** | **6** | |

## How to Use This Test Plan

1. **Open the app** at the URL above in one browser tab
2. **Open the test file** (e.g., `01_submission.md`) side-by-side
3. **Follow each test case** step by step
4. **Check off** expected results as you verify them (`- [ ]` → `- [x]`)
5. **Mark Pass/Fail** and add notes for any issues found
6. **Recommended order:** Start with P1 tests in each category, then P2, then P3

## Suggested Execution Order

**Round 1 — Critical Path (P1 only, ~18 tests):**
1. KT-SUB-001, KT-SUB-002, KT-SUB-003 (submit valid ringi)
2. KT-APR-001, KT-APR-002 (approve/reject)
3. KT-APR-005 (staff can't approve — security)
4. KT-STS-001, KT-STS-002 (status display)
5. KT-ROL-001, KT-ROL-002, KT-ROL-003 (role permissions)
6. KT-ROL-005 (admin URL protection)
7. KT-AIC-001, KT-AIC-002, KT-AIC-003, KT-AIC-009 (AI chat core + file submission)
8. KT-AIR-001, KT-AIR-002 (AI retrieval core)

**Round 2 — Standard Features (P2, ~24 tests):**
- Remaining tests in each category including KT-AIC-010 to 013

**Round 3 — Edge Cases (P3, ~6 tests):**
- Low-priority boundary tests
