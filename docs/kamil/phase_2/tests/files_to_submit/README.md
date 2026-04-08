# Test Files for Phase 2 Ringi QA

Pre-filled documents for manual testing of the Ringi submission system.

**Test URL:** https://eb-filemg-development.vercel.app

| Role | Email |
|------|-------|
| Admin | superadmin@gmail.com |
| Manager | manager@gmail.com |
| Staff | staff@gmail.com |

---

## File Manifest

### Valid Ringi Documents (pre-filled with realistic data)

| File | Lang | Form Type | Content | Amount |
|------|------|-----------|---------|--------|
| `ringi_en_detailed_license_renewal.docx` | EN | Detailed form | Adobe Creative Cloud license renewal, Sales dept, Hanako Suzuki | $12,500 |
| `ringi_en_form_laptop_purchase.docx` | EN | Standard form | Laptop procurement for new hires, Engineering dept, Taro Yamada | $6,000 |
| `ringi_en_simple_conference.docx` | EN | Simple form | Tech Summit Tokyo 2026 attendance, Marketing dept, Ken Tanaka | $2,000 |
| `ringi_en_purchase_monitors.docx` | EN | Purchase form | Dell 4K monitors x5, IT dept, Yuki Sato | $3,750 |
| `ringi_en_spreadsheet_cloud.xlsx` | EN | Excel format | AWS cloud infrastructure migration, Operations dept, Akira Watanabe | $33,600/yr |
| `ringi_jp_purchase_chairs.docx` | JP | 購買稟議書 | オフィスチェア10脚, 総務部, 田中太郎 | ¥500,000 |
| `ringi_jp_standard_salesforce.docx` | JP | 稟議書 | Salesforce Sales Cloud導入, 営業部, 鈴木花子 | ¥4,100,000 |
| `ringi_jp_formal_server.docx` | JP | 稟議書 | AWS EC2サーバー増設, 開発部, 佐藤勇気 | $10,080/yr |
| `ringi_jp_spreadsheet_accounting.xlsx` | JP | Excel形式 | freee会計プロフェッショナル更新, 経理部, 渡辺明 | ¥600,000/yr |
| `ringi_jp_legacy_template.doc` | JP | Legacy .doc | Blank template (legacy format compatibility test) | — |

### Edge Case Files

| File | Purpose | Expected Behavior |
|------|---------|-------------------|
| `edge_beach_image.jpg` | Non-document image file | Should be rejected or handled gracefully |
| `edge_empty_file.pdf` | Minimal blank PDF (no text content) | Test empty document handling |
| `edge_large_file.pdf` | ~340KB multi-page PDF | Test larger file upload |
| `edge_special_chars_名前.docx` | Filename with Japanese characters | Test unicode in filenames |

---

## Test Case Mapping

| TC-ID | Test Case | File to Use |
|-------|-----------|-------------|
| KT-SUB-001 | Submit with valid EN doc | `ringi_en_detailed_license_renewal.docx` |
| KT-SUB-002 | Submit with valid JP doc | `ringi_jp_purchase_chairs.docx` |
| KT-SUB-003 | Submit all fields + line items | `ringi_en_purchase_monitors.docx` |
| KT-SUB-005 | Submit with Excel attachment | `ringi_jp_spreadsheet_accounting.xlsx` |
| KT-SUB-007 | Wrong file type | `edge_beach_image.jpg` |
| KT-SUB-008 | Empty PDF | `edge_empty_file.pdf` |
| KT-SUB-009 | Special chars filename | `edge_special_chars_名前.docx` |
| KT-AIC-003 | Upload doc + AI summarize | `ringi_en_detailed_license_renewal.docx` |
| KT-AIC-004 | Ask AI about JP doc | `ringi_jp_standard_salesforce.docx` |
| KT-AIC-005 | Upload image for AI | `edge_beach_image.jpg` |
| KT-AIC-007 | Non-ringi doc for AI | `edge_large_file.pdf` |

### Naming Convention
- **Valid**: `ringi_{en|jp}_{form-type}_{content}.{ext}`
- **Edge case**: `edge_{description}.{ext}`
