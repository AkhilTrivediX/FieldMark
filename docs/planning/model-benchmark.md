# Local Model Smoke Test

Test date: 2026-07-04

Test file: `model-test-invoice.png`

The test invoice intentionally prints the wrong total:

- Subtotal: 4240.00
- GST 10%: 424.00
- Shipping: 120.00
- Discount: 0.00
- Printed invoice total: 4820.00
- Correct calculated total: 4784.00
- Discrepancy: 36.00

## MiniCPM-V 4.6

Ollama model: `minicpm-v4.6`

- Downloaded footprint: about 1.6 GB.
- Elapsed time: 9.65 seconds.
- Returned final response content: yes.
- Extracted most visible fields: vendor, customer, invoice number, dates, line items, subtotal, tax, shipping, total.
- Missed GSTIN.
- Failed arithmetic validation by copying the printed total into `calculated_total` and reporting the printed total as correct.

Verdict: best first local VLM fallback because it is small, quick, and returns usable final JSON. It must not own validation logic.

## Qwen3-VL 4B

Ollama model: `qwen3-vl:4b`

- Downloaded footprint: about 3.3 GB.
- Quantization: Q4_K_M.
- Short prompt elapsed time: 1.45 seconds.
- JSON-format prompt elapsed time: 4.56 seconds.
- Chat extraction prompt elapsed time: 20.38 seconds before length cutoff.
- Read GSTIN successfully.
- In an unconstrained reasoning pass, detected the correct calculated total of 4784.00 and noticed the mismatch against 4820.00.
- In strict extraction/JSON mode, final response content was empty and the structured JSON appeared in the thinking field.

Verdict: stronger document understanding than MiniCPM-V, but the current local Ollama behavior is not production-safe for strict JSON extraction without an adapter or model template fix.

## Product Decision

Use an OCR-first pipeline:

1. PaddleOCR PP-OCRv5/v6 or RapidOCR produces text blocks, confidences, and boxes.
2. Local extraction model maps OCR blocks into schema JSON.
3. Evidence matcher links field values to OCR boxes.
4. Deterministic validator calculates totals, tax, line-item sums, duplicate checks, dates, and required evidence.
5. Targeted VLM crops are used only when OCR confidence or schema extraction is low.

The validation engine must produce the accounting-grade answer:

```json
{
  "severity": "error",
  "path": "invoice_total",
  "rule": "subtotal + tax_total + shipping - discount == invoice_total",
  "expected": 4784.0,
  "actual": 4820.0,
  "discrepancy_amount": 36.0
}
```
