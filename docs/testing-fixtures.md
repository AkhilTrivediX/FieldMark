# Fixture Testing

FieldMark includes generated invoice fixtures in `fixtures/invoices`.

The fixtures are intentionally varied:

- clean desktop PDF-like invoice
- low-contrast scan
- blurred phone capture
- rotated receipt-style invoice
- shadowed mobile photo
- cropped edge invoice
- tiny-font statement
- handwritten adjustment note
- wide table invoice
- invoice with a deliberate total mismatch

Each fixture has an SVG image and a JSON manifest. The manifest records expected invoice fields, amounts, evidence IDs, and scan-quality labels. Tests use the manifests to verify validation, exports, upload intake, and correction flows.

This does not claim production OCR accuracy yet. It gives us a repeatable fixture bank for comparing PaddleOCR, Tesseract, Apple Vision, or a small local VLM later without rewriting the product validation layer.
