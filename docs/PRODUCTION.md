# Production Checklist

## Verified In This Build

- Local vault review bench renders on desktop and mobile.
- Field rows remain left-aligned and editable.
- Scan-quality checks are visible in the extraction rail.
- Validation blocks documents with total mismatches or scan-quality errors.
- Accounting CSV export is disabled when any document has blocking validation errors.
- Evidence JSON export remains available for review/debug records.
- Fixture lab displays 12 generated poor-quality invoice cases.
- Any fixture can be loaded into the real vault workflow.
- README includes banner, screenshots, and MP4/WebM demo media.

## Automated Checks

Run:

```bash
pnpm fixtures:generate
pnpm test:all
```

Current coverage:

- domain validation
- CSV export readiness
- JSON/CSV export formatting
- scan-quality classification
- generated fixture manifests and SVGs
- fixture-to-document conversion
- correction flow for mismatched totals
- TypeScript compile
- production Vite build

## Manual Browser QA

Captured under `docs/qa`:

- desktop vault
- desktop fixture lab
- blocked export state
- mobile vault

Final browser pass confirmed:

- no console errors
- mobile body width equals viewport width
- Test Lab navigation is present
- FieldMark branding is visible

## Adapter Boundary

The product ships a production UI, validation model, fixture lab, export gating, brand assets, and demo media. Real OCR/VLM extraction should plug into the document model through the same validation and fixture suite. Recommended next implementation branch: local PaddleOCR or Apple Vision adapter for Mac Mini-class hardware.
