# Fieldmark Product Plan

Private, schema-aware document extraction for invoices, receipts, statements, and business documents.

## Positioning

Fieldmark turns scanned business documents into validated, evidence-linked JSON without requiring customers to send sensitive files to external human reviewers. It is not an OCR utility. It is a local-first extraction workspace that combines fast OCR, schema-aware AI extraction, deterministic validation, and accounting-ready exports.

Primary wedge:

- Local-first processing by default.
- Evidence highlights for every important field.
- Schema learning from the customer's own documents and corrections.
- Deterministic checks for totals, tax, line items, duplicates, dates, and required source evidence.
- Transparent SMB pricing, with hosted sync and integrations as paid conveniences.

## Target Users

- Small businesses that scan invoices, receipts, statements, challans, and bills.
- Bookkeepers handling multiple clients and document categories.
- Accountants who need defensible extraction, auditability, and export packs.
- Privacy-sensitive operators who dislike cloud-only scanners or enterprise IDP pricing.

## Market Read

The market is split into four groups:

1. PDF utilities such as iLovePDF and Adobe Acrobat: strong at searchable/editable PDFs, weak at accounting-ready JSON and validation.
2. Bookkeeping capture suites such as Dext, Hubdoc, AutoEntry, Expensify: useful but cloud-first, workflow/pricing constrained, and often built around broader expense/accounting ecosystems.
3. Enterprise IDP/AP platforms such as Rossum, Nanonets, Docsumo, Klippa, Veryfi: powerful, but usually API-first, custom-priced, or too complex for small teams.
4. Open-source tools such as Paperless-ngx, OCRmyPDF, invoice2data: private and flexible, but DIY for schema learning, validation, review UX, and exports.

Most competitors say "secure" through encryption, retention, compliance, or data residency. The stronger gap is "documents stay local unless you explicitly choose otherwise."

## MVP Scope

The first useful product should be narrow and trustworthy:

- Single-user local workspace.
- Upload PDF/image folders.
- OCR with text, confidence, page coordinates, and image thumbnails.
- Manual category selection for purchase invoice, receipt, and bank statement.
- Fixed starter schemas with editable field definitions.
- Local extraction into strict JSON.
- Evidence highlights for extracted fields.
- Validation checks:
  - subtotal + tax + freight - discount = total
  - line item quantity * rate = amount
  - line item sum = subtotal
  - due date >= issue date
  - duplicate invoice number per vendor
  - required evidence for total, vendor, invoice number, and date
- User correction flow.
- JSON, CSV, and XLSX export.
- Local encrypted database.

MVP should avoid:

- External human review.
- Full accounting sync.
- Enterprise RBAC.
- Automatic schema mutation.
- VLM-only OCR.
- Multi-tenant SaaS before the local workflow is excellent.

## V1 Scope

- Desktop app plus optional hosted account.
- Workspace sync toggle: local-only, encrypted sync, or hosted processing.
- Schema editor and schema versioning.
- Category auto-detection.
- Import old CSV/JSON/XLSX data and map it to schemas.
- Batch processing and watch folders.
- Vendor profiles and learned aliases.
- Schema suggestions from repeated corrections.
- Export presets for QuickBooks, Xero, Zoho Books, Tally-friendly CSV, and generic webhooks.
- Audit log for import, extraction, correction, approval, export, and delete.
- BYOK model routing for hosted mode.

## V2 Scope

- Multi-client bookkeeper workflow.
- Team roles and client portals.
- Email ingestion and mobile scan capture.
- Multi-document split and merge.
- Statement reconciliation and bank transaction matching.
- PO / GRN / invoice three-way matching.
- Field-level encryption and BYOK.
- On-prem/private-cloud deployment.
- Integration marketplace.
- Regression tests for schemas using historical document sets.

## Core Workflow

```text
Upload or scan
-> pre-process image/PDF
-> OCR/layout with coordinates
-> category detection
-> schema selection
-> local/hosted extractor returns strict JSON + evidence IDs
-> deterministic validation
-> exception review
-> correction learning
-> export or sync
```

## Technical Architecture

### Local-first App

Recommended shape:

- Desktop shell: Tauri v2.
- Frontend: React + TypeScript + Vite.
- Local API: Rust commands for filesystem/security plus a Python sidecar for OCR/model jobs, or a local FastAPI service managed by the desktop app.
- Local database: SQLite with SQLCipher or app-level encrypted document blobs.
- File storage: encrypted content-addressed file vault.
- Background jobs: local queue for OCR, extraction, validation, thumbnails, and exports.
- Hosted mode later: same API contract, different job runner.

Why Tauri:

- Smaller footprint than Electron.
- Good fit for local vault behavior.
- Lets us keep a polished web UI while running local binaries.

### Backend Services

Use these boundaries from day one:

- `ingestion`: file import, PDF rendering, checksums, page images.
- `ocr`: OCR/layout engines and normalized block output.
- `schema`: categories, JSON schemas, field definitions, versions.
- `extractor`: model adapters and structured JSON extraction.
- `evidence`: field-to-block coordinates and highlights.
- `validator`: deterministic rule engine.
- `review`: corrections, approvals, revision history.
- `export`: JSON/CSV/XLSX/accounting mappings.
- `sync`: optional encrypted sync and account licensing.

### Data Stores

Core tables:

- `workspaces`
- `documents`
- `document_files`
- `pages`
- `text_blocks`
- `categories`
- `schemas`
- `schema_fields`
- `extraction_runs`
- `extracted_fields`
- `evidence_spans`
- `validation_rules`
- `validation_results`
- `review_corrections`
- `vendors`
- `imports`
- `exports`
- `audit_events`

Extraction runs should be immutable. Corrections create revisions. Schema changes create new schema versions, not retroactive rewrites.

## Model Strategy

Default path for a 16GB Mac mini:

```text
PaddleOCR or RapidOCR
-> normalized text blocks with boxes
-> rule/table grouping
-> small local model maps blocks to schema JSON
-> deterministic validator checks math/business rules
-> targeted VLM crop fallback only for failed/uncertain fields
```

Do not make a VLM read every page from pixels as the primary path. It is slower, less explainable, and more expensive.

### Recommended First Stack

- OCR default: PaddleOCR PP-OCRv5 or PP-OCRv6 if stable in the selected runtime.
- Lightweight OCR alternative: RapidOCR.
- Layout/table fallback: PP-StructureV3 only for complex tables or documents where the simple OCR grouping fails.
- Local VLM/LLM trial 1: MiniCPM-V 4.6 for speed and stable local JSON responses.
- Local VLM/LLM trial 2: Qwen3-VL 4B for stronger document understanding once the structured-output adapter is stable.
- Quality fallback: Qwen3-VL 8B, only when 4B/1.3B cannot handle the user's documents.
- Hosted/BYOK optional: OpenAI, Mistral OCR, Google Document AI, AWS Textract, Azure Document Intelligence.

### Mac Mini 16GB Test Matrix

Run tests on the actual target Mac, not this Windows planning machine.

Use a 30-document private benchmark:

- 10 clean invoices.
- 5 low-quality mobile photos.
- 5 receipts.
- 5 multi-line/table-heavy invoices.
- 5 bank statements or delivery challans.

Metrics:

- OCR text accuracy by key fields.
- Field extraction F1.
- Evidence match accuracy.
- Validation pass/fail correctness.
- Time per page.
- Peak memory.
- Disk footprint.
- Correction effort in clicks/seconds.

Initial commands:

```bash
ollama pull minicpm-v4.6
ollama pull qwen3-vl:4b
ollama pull qwen3-vl:8b
```

Clean up immediately after benchmarking:

```bash
ollama rm minicpm-v4.6
ollama rm qwen3-vl:4b
ollama rm qwen3-vl:8b
ollama list
```

Keep only the winner and one fallback. For the first production prototype, keep MiniCPM-V 4.6 as the first local VLM fallback because it returned usable final JSON quickly. Keep Qwen3-VL 4B as the accuracy contender, but only after the local adapter can reliably move structured output from the thinking channel into final content.

### Windows Smoke Test Results

Synthetic invoice: `model-test-invoice.png`, with a deliberate total error. Printed total is 4820.00. Correct calculation is 4240.00 + 424.00 + 120.00 - 0.00 = 4784.00, so the discrepancy is 36.00.

MiniCPM-V 4.6 through Ollama:

- Disk footprint: about 1.6 GB.
- Runtime on this Windows machine: 9.65 seconds for one invoice image.
- Strength: returned usable final JSON with invoice number, dates, line items, subtotal, tax, shipping, and total.
- Weakness: missed GSTIN and copied the bad printed total as the calculated total.

Qwen3-VL 4B through Ollama:

- Disk footprint: about 3.3 GB, Q4_K_M quantization.
- Runtime on this Windows machine: 1.45 seconds for a short invoice-number/total prompt; 4.56 seconds in JSON-format mode; 20.38 seconds on the chat extraction prompt before hitting the length limit.
- Strength: read the GSTIN and, in an unconstrained reasoning pass, identified the 4784.00 expected total and the mismatch with the printed 4820.00.
- Weakness: the local Ollama package repeatedly placed structured extraction in the thinking field while leaving final content empty, so it needs an adapter/template fix before it is safe for production JSON extraction.

Decision: OCR/layout plus deterministic validation remain the core. Do not trust any local VLM to validate arithmetic. Use the model to map OCR blocks to schema fields, then let code calculate totals, rule failures, and evidence completeness.

## Validation Engine

Validation must be deterministic and explainable. The model can suggest values; code decides whether math and business rules pass.

Rule layers:

1. JSON schema validation.
2. Normalization for dates, money, percentages, tax IDs, and currencies.
3. Field checks.
4. Cross-field math.
5. Historical duplicate/entity checks.
6. Workspace policies.
7. Evidence requirements.

Every failed rule should include:

- severity
- field path
- expected value
- actual value
- rule expression
- explanation
- source evidence if relevant

Example:

```json
{
  "severity": "error",
  "path": "total",
  "rule": "subtotal + tax + freight - discount == total",
  "expected": 4784.0,
  "actual": 4820.0,
  "message": "Invoice total does not match the calculated total."
}
```

## Design Direction

Product register: task-first product UI, not a marketing landing page.

Physical scene:

> A bookkeeper is reviewing a stack of supplier invoices late afternoon, with one monitor for the document, one panel for validated fields, and no patience for decorative UI.

Color strategy:

- Restrained product UI.
- Pure white and cool neutral surfaces.
- Carbon primary used for primary action and selected work states.
- Blue accent for evidence and schema intelligence.
- Green/yellow/red reserved for validation states.

The feel should borrow iLovePDF's clarity and approachable utility, but become more personal through saved workspace state, local vault language, evidence marks, schemas, and document memory.

## Pricing Hypothesis

Open-source:

- Core local app.
- Local OCR/extraction adapters.
- JSON/CSV export.
- Schema/rule editor basics.

Paid hosted:

- Encrypted sync.
- Hosted OCR/model acceleration.
- Team workspaces.
- Accounting integrations.
- Email ingestion.
- Mobile scan companion.
- Support and managed updates.

Suggested early pricing:

- Free local: personal use, local-only.
- Solo hosted: $12-19/month with modest hosted processing.
- Bookkeeper: $39-79/month, multi-client workspaces, no-expiry document allowance.
- Usage add-on: pay for successful hosted extractions, not failed attempts.

Avoid expiring credits and forced annual lock-in early. That is a visible competitor pain.

## Build Order

1. Build local ingestion + OCR block viewer.
2. Add schema registry and fixed invoice schema.
3. Add extractor adapter with strict JSON outputs.
4. Add evidence highlights.
5. Add deterministic validator.
6. Add review/correction loop.
7. Add CSV/JSON/XLSX export.
8. Add schema suggestions from corrections.
9. Add local desktop packaging.
10. Add optional hosted account/sync.

## Open Risks

- Local model accuracy may be inconsistent across messy invoices.
- PaddleOCR installation can be heavy; RapidOCR may be needed for lightweight distribution.
- Schema learning can confuse users if it changes too aggressively.
- Accounting export formats can become a support burden.
- Security claims need to be precise and conservative.
- A 16GB Mac mini can run useful local models, but batch speed must be managed through queues, crops, and fallbacks.
