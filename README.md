# FieldMark

FieldMark is a local-first invoice extraction and review workspace. It is built around a simple promise: keep documents private, show exactly where data came from, and let code verify invoice math before anyone approves the record.

## Current MVP

- Local vault review bench with document queue, PDF-style invoice viewer, evidence highlights, and editable extracted fields.
- Invoice validation for totals, line-item sums, due-date order, and required evidence.
- Schema screen for field paths, aliases, evidence requirements, and suggested schema promotion.
- Validation ledger for approval-blocking issues across documents.
- Local/export screen with JSON and CSV downloads.
- Responsive desktop and mobile layouts.
- Generated fixture suite covering clean, low-contrast, blurred, rotated, shadowed, cropped, tiny-font, and mismatch invoices.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5174`.

## Verify

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm fixtures:generate
pnpm test:fixtures
```

## Privacy modes

- `Local`: documents stay on the device.
- `Sync`: encrypted sync may be enabled later.
- `Hosted`: hosted processing can be used as a future fallback.

The MVP currently uses deterministic sample extraction and validation logic. The fixture harness is ready for local OCR/model integration so future commits can compare real OCR output against the same expected invoice manifests.
