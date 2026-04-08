# 01 — Submission Tests

Test the ringi submission workflow: creating new submissions with various documents, formats, and edge cases.

**Login as:** `staff@gmail.com`
**Dashboard URL:** `https://eb-filemg-development.vercel.app/`
**Submission Dialog:** Click "New Submission" button on the dashboard

### Submission Form Fields

The submission dialog contains these fields (see `00_overview.md` for full reference):

1. Submission Category (button group) → 2. Title * → 3. Priority * → 4. Department * → 5. Items & Services (Add Item) → 6. Tax Calculation toggle (Purchasing only) → 7. Vendor Name * → 8. Payment Schedule Date * → 9. Payment Method * → 10. Required by Date * → 11. Reason for Purchase * → 12. Purpose * → 13. Remarks (optional) → 14. Attachments (drag & drop) → 15. Approval Route (read-only)

---

### KT-SUB-001 — Submit with valid EN doc `[Main]` `[P1]`

**File:** `ringi_en_detailed_license_renewal.docx`
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Go to `https://eb-filemg-development.vercel.app/`
2. Login with `staff@gmail.com`
3. Click **"New Submission"** button on the dashboard
4. Fill in the submission form:
   - **Submission Category:** Click `Purchasing`
   - **Submission Title:** `Annual Software License Renewal`
   - **Priority:** Select `High`
   - **Department:** `Sales`
   - **Items & Services:** Click "Add Item"
     - Item Name: `Adobe CC Enterprise License`
     - QTY: `1`
     - Price: `12500`
   - **Enable Tax Calculation:** OFF (leave unchecked)
   - **Vendor Name:** `Adobe Inc.`
   - **Payment Schedule Date:** `2026-03-15`
   - **Payment Method:** Select `Bank Transfer`
   - **Required by Date:** `2026-03-01`, Time: `09:00`
   - **Reason for Purchase:** `Annual renewal of Adobe Creative Cloud Enterprise licenses for Sales dept. Current license expires March 31, 2026.`
   - **Purpose:** `Maintain design tool access for Sales marketing materials`
   - **Remarks:** (leave empty)
5. In **Attachments**, drag and drop `ringi_en_detailed_license_renewal.docx`
6. Verify **Estimated Approval Route** shows: Requester → Manager → Accountant
7. Click **"Create Submission"**

**Expected:**
- [ ] Submission created successfully (success toast/notification)
- [ ] Status shows "Pending" on dashboard card
- [ ] Attached file is visible in detail view (click submission to open)
- [ ] All fields saved correctly: Title="Annual Software License Renewal", Priority=High, Amount=$12,500
- [ ] Approval route visible in detail view

**Result:** Pass / Fail
**Notes:** ___

---

### KT-SUB-002 — Submit with valid JP doc `[Main]` `[P1]`

**File:** `ringi_jp_purchase_chairs.docx`
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"** on the dashboard
3. Fill in the submission form:
   - **Submission Category:** Click `Purchasing`
   - **Submission Title:** `オフィスチェア購入稟議`
   - **Priority:** Select `Medium`
   - **Department:** `総務部`
   - **Items & Services:** Click "Add Item"
     - Item Name: `エルゴノミクスオフィスチェア`
     - QTY: `10`
     - Price: `50000`
   - **Enable Tax Calculation:** ON → Tax Rate: `10` %
   - **Vendor Name:** `オフィス家具株式会社`
   - **Payment Schedule Date:** `2026-04-01`
   - **Payment Method:** Select `Bank Transfer`
   - **Required by Date:** `2026-03-20`, Time: `10:00`
   - **Reason for Purchase:** `総務部用オフィスチェア10脚の購入申請。現在のチェアは5年以上使用しており、交換が必要。`
   - **Purpose:** `従業員の作業環境改善`
4. Drag and drop `ringi_jp_purchase_chairs.docx` into Attachments
5. Click **"Create Submission"**

**Expected:**
- [ ] Submission created with Japanese content displayed correctly (no garbled text)
- [ ] File attached successfully
- [ ] Status shows "Pending"
- [ ] Tax calculation applied correctly if enabled (¥500,000 + 10% = ¥550,000 total)

**Result:** Pass / Fail
**Notes:** ___

---

### KT-SUB-003 — Submit with all fields + line items `[Main]` `[P1]`

**File:** `ringi_en_purchase_monitors.docx`
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"** on the dashboard
3. Fill **ALL** fields:
   - **Submission Category:** Click `Purchasing`
   - **Submission Title:** `Dell 4K Monitor Purchase for Development Team`
   - **Priority:** Select `Medium`
   - **Department:** `IT`
   - **Items & Services:** Click "Add Item" twice to create 2 line items:
     - Item 1: Name=`Dell UltraSharp U2723QE 27"`, QTY=`5`, Price=`750`
     - Item 2: Name=`Monitor Stand Arm`, QTY=`5`, Price=`0` (optional item, test with zero)
   - **Enable Tax Calculation:** OFF
   - **Vendor Name:** `Dell Technologies`
   - **Payment Schedule Date:** `2026-04-15`
   - **Payment Method:** Select `Credit Card`
   - **Required by Date:** `2026-04-01`, Time: `14:00`
   - **Reason for Purchase:** `Purchase 5x Dell UltraSharp U2723QE 27-inch 4K monitors for development team workstations. Current monitors are 1080p and insufficient for code review and design work.`
   - **Purpose:** `Improve developer productivity with high-resolution displays`
   - **Remarks:** `Please coordinate with IT for installation scheduling. Monitors should be delivered to Building A, Floor 3.`
4. Attach `ringi_en_purchase_monitors.docx`
5. Click **"Create Submission"**

**Expected:**
- [ ] All fields saved correctly
- [ ] Both line items visible in detail view (Dell monitors + Monitor stands)
- [ ] Attachment visible and downloadable
- [ ] Status shows "Pending"
- [ ] Total amount calculated correctly ($3,750)

**Result:** Pass / Fail
**Notes:** ___

---

### KT-SUB-004 — Submit with minimum fields `[Basic]` `[P2]`

**File:** (none)
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"**
3. Fill **only** the required fields with minimal data:
   - **Submission Category:** Click `Other`
   - **Submission Title:** `Minimum Fields Test`
   - **Priority:** Select `Low`
   - **Department:** `General`
   - **Vendor Name:** `N/A`
   - **Payment Schedule Date:** `2026-05-01`
   - **Payment Method:** Select `Cash`
   - **Required by Date:** `2026-04-30`, Time: `17:00`
   - **Reason for Purchase:** `Testing minimum required fields`
   - **Purpose:** `QA Test`
4. Do NOT add any line items
5. Do NOT attach any file
6. Leave Remarks empty
7. Click **"Create Submission"**

**Expected:**
- [ ] Submission created successfully with only required data
- [ ] No validation errors on optional fields (Items, Remarks, Attachments)
- [ ] Submission appears on dashboard with "Pending" status

**Result:** Pass / Fail
**Notes:** ___

---

### KT-SUB-005 — Submit with Excel attachment `[Basic]` `[P2]`

**File:** `ringi_jp_spreadsheet_accounting.xlsx`
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"**
3. Fill in:
   - **Submission Category:** Click `Expense`
   - **Submission Title:** `会計ソフト更新`
   - **Priority:** Select `Medium`
   - **Department:** `経理部`
   - **Items & Services:** Click "Add Item"
     - Item Name: `freee会計 年間ライセンス`
     - QTY: `1`
     - Price: `600000`
   - **Vendor Name:** `freee株式会社`
   - **Payment Schedule Date:** `2026-04-01`
   - **Payment Method:** Select `Bank Transfer`
   - **Required by Date:** `2026-03-25`, Time: `10:00`
   - **Reason for Purchase:** `経理部の会計ソフトfreeeの年間ライセンス更新`
   - **Purpose:** `経理業務の継続`
4. Attach `ringi_jp_spreadsheet_accounting.xlsx` (Excel format)
5. Click **"Create Submission"**

**Expected:**
- [ ] Excel file (.xlsx) accepted as attachment
- [ ] Submission created successfully
- [ ] File is downloadable/viewable from detail view

**Result:** Pass / Fail
**Notes:** ___

---

### KT-SUB-006 — Edit pending submission `[Basic]` `[P2]`

**File:** (none)
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** An existing pending submission by staff@gmail.com (create one first if needed)

**Steps:**
1. Login with `staff@gmail.com`
2. Go to dashboard at `https://eb-filemg-development.vercel.app/`
3. Click on a submission card with "Pending" status to open detail view at `/approval-requests/[id]`
4. Click **Edit** button
5. Change the title to: `Updated: [original title]`
6. Change the Priority from current value to `Critical`
7. Save changes

**Expected:**
- [ ] Edit button is available on pending submissions
- [ ] Edit form loads with existing data pre-filled
- [ ] Changes are saved successfully
- [ ] Submission remains in "Pending" status after edit
- [ ] Updated values visible in detail view

**Result:** Pass / Fail
**Notes:** ___

---

### KT-SUB-007 — Submit with image file (wrong type) `[Edge Case]` `[P2]`

**File:** `edge_beach_image.jpg`
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"**
3. Fill required fields:
   - **Submission Category:** Click `Other`
   - **Submission Title:** `Edge Case Test - Image Upload`
   - **Priority:** Select `Low`
   - **Department:** `QA`
   - **Vendor Name:** `Test`
   - **Payment Schedule Date:** `2026-05-01`
   - **Payment Method:** Select `Cash`
   - **Required by Date:** `2026-04-30`, Time: `17:00`
   - **Reason for Purchase:** `Testing image file upload behavior`
   - **Purpose:** `QA Edge Case`
4. Attempt to attach `edge_beach_image.jpg`
5. Try to submit

**Expected:**
- [ ] System either rejects the image file type with a clear message, OR
- [ ] System accepts it but handles gracefully (no crash, no corrupt data)

**Result:** Pass / Fail
**Notes:** Document what actually happens — rejected? accepted? error message? ___

---

### KT-SUB-008 — Submit with empty PDF `[Edge Case]` `[P3]`

**File:** `edge_empty_file.pdf`
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"**
3. Fill required fields:
   - **Submission Category:** Click `Other`
   - **Submission Title:** `Edge Case Test - Empty PDF`
   - **Priority:** Select `Low`
   - **Department:** `QA`
   - **Vendor Name:** `Test`
   - **Payment Schedule Date:** `2026-05-01`
   - **Payment Method:** Select `Cash`
   - **Required by Date:** `2026-04-30`, Time: `17:00`
   - **Reason for Purchase:** `Testing empty PDF upload behavior`
   - **Purpose:** `QA Edge Case`
4. Attach `edge_empty_file.pdf` (blank PDF with no text content)
5. Click **"Create Submission"**

**Expected:**
- [ ] System handles the blank PDF without crashing
- [ ] Either accepts with no issue, or shows appropriate warning

**Result:** Pass / Fail
**Notes:** ___

---

### KT-SUB-009 — Submit with special chars in filename `[Edge Case]` `[P2]`

**File:** `edge_special_chars_名前.docx`
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"**
3. Fill required fields:
   - **Submission Category:** Click `Other`
   - **Submission Title:** `Edge Case Test - Special Characters`
   - **Priority:** Select `Low`
   - **Department:** `QA`
   - **Vendor Name:** `Test`
   - **Payment Schedule Date:** `2026-05-01`
   - **Payment Method:** Select `Cash`
   - **Required by Date:** `2026-04-30`, Time: `17:00`
   - **Reason for Purchase:** `Testing special character filename handling`
   - **Purpose:** `QA Edge Case`
4. Attach `edge_special_chars_名前.docx` (note the Japanese characters in filename)
5. Click **"Create Submission"**

**Expected:**
- [ ] File uploaded successfully
- [ ] Filename displayed correctly (Japanese characters preserved)
- [ ] Submission created without errors

**Result:** Pass / Fail
**Notes:** ___

---

### KT-SUB-010 — Submit with very large amount `[Edge Case]` `[P3]`

**File:** (none)
**Spec Ref:** Spec 6.1 (Submission)

> **Precondition:** Login as staff@gmail.com

**Steps:**
1. Login with `staff@gmail.com`
2. Click **"New Submission"**
3. Fill required fields:
   - **Submission Category:** Click `Other`
   - **Submission Title:** `Edge Case Test - Large Amount`
   - **Priority:** Select `Low`
   - **Department:** `QA`
   - **Items & Services:** Click "Add Item"
     - Item Name: `Large Amount Test Item`
     - QTY: `1`
     - Price: `999999999999` (12 digits)
   - **Vendor Name:** `Test`
   - **Payment Schedule Date:** `2026-05-01`
   - **Payment Method:** Select `Cash`
   - **Required by Date:** `2026-04-30`, Time: `17:00`
   - **Reason for Purchase:** `Testing large amount handling`
   - **Purpose:** `QA Edge Case`
4. Click **"Create Submission"**

**Expected:**
- [ ] System either accepts the large number, OR
- [ ] Shows a validation message for maximum allowed amount
- [ ] No crash or data corruption

**Result:** Pass / Fail
**Notes:** ___
