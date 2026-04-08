# Ringi Submission - AI Pre-fill Fields from File Upload

Fields extracted via structured output after uploading a file (e.g., invoice, receipt, quotation):

| Field | Type | Description |
|---|---|---|
| `title` | string | Auto-generated title from document content |
| `description` | string | Summary of the document |
| `amount` | number | Total amount extracted from the document |
| `category` | string | AI-classified category |
| `vendor_name` | string | Vendor/supplier name from the document |
| `date` | string | Document date (invoice date, receipt date, etc.) |
| `purpose` | string | Purpose derived from document context |
| `reason_for_purchase` | string | Reason inferred from document content |
| `items` | JSON array | Line items extracted (name, quantity, unit price, subtotal) |
| `payment_method` | string | Payment method if mentioned in the document |
| `payment_schedule_date` | string | Payment due date if present |
| `is_tax_included` | boolean | Whether the amount includes tax |
| `is_use_tax` | boolean | Whether tax applies |
| `tax_rate` | number | Tax rate extracted from the document |
| `department` | string | Department if identifiable from context |
| `priority` | string | AI-suggested priority based on due dates/urgency |
| `remarks` | string | Additional notes extracted from the document |
