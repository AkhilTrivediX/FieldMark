# Design

## System

FieldMark is a local-first document workstation. It should feel more like a precise scanning bench than a SaaS dashboard: document surfaces, evidence rails, validation strips, schema controls, and fixture testing arranged for repeated work.

## Palette

Use OKLCH tokens. White and cool neutral surfaces dominate; carbon is reserved for decisive actions; evidence blue is used only for source tracing; semantic colors are reserved for validation, confidence, and scan quality.

```css
:root {
  --bg: oklch(1 0 0);
  --ink: oklch(0.17 0.025 255);
  --muted: oklch(0.43 0.026 255);
  --line: oklch(0.86 0.012 255);
  --chrome: oklch(0.965 0.008 255);
  --selected: oklch(0.95 0.03 235);
  --evidence: oklch(0.63 0.14 220);
  --success: oklch(0.53 0.13 150);
  --warning: oklch(0.71 0.12 78);
  --danger: oklch(0.55 0.17 28);
  --carbon: oklch(0.18 0.026 255);
}
```

## Typography

Use a system sans stack for product reliability:

```css
ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
```

No display-font theatrics inside the product. Hierarchy comes from spacing, weight, proximity, document scale, and side-by-side evidence.

## Layout

- Top command bar, not a heavy dashboard shell.
- Left document queue as file artifacts.
- Center document bench for page rendering and source marks.
- Right extraction rail for fields, scan quality, validation, and actions.
- Product tabs for schema, validation ledger, exports, and fixture lab.
- On mobile, queue becomes a horizontal strip, the document scales, and extraction flows below it.

## Components

- Document bench: central white page on a cool neutral scanner surface.
- Evidence marks: thin precise outlines linked to field rows.
- Field rows: compact, editable, with confidence and evidence affordances.
- Scan-quality panel: source readability score plus warning/error chips.
- Validation panel: formula, expected value, actual value, severity.
- Fixture lab: test material list with thumbnails, tags, expected quality, and approval status.
- Export controls: local JSON/CSV first, hosted/sync modes explicit.

## Motion

Motion is restrained and functional:

- hover/focus feedback on field rows and document controls
- upload/OCR stage transitions
- validation and scan-quality state changes

No page-load choreography or decorative motion.
