# Design

## System

Fieldmark is a local-first document workstation. The interface should feel more like a precise scanning bench than a SaaS dashboard: document surfaces, evidence rails, validation strips, and schema controls arranged for repeated work.

## Palette

Use OKLCH tokens.

```css
:root {
  --fm-bg: oklch(1 0 0);
  --fm-ink: oklch(0.17 0.025 255);
  --fm-muted: oklch(0.45 0.028 255);
  --fm-line: oklch(0.87 0.012 255);
  --fm-wash: oklch(0.965 0.006 255);
  --fm-panel: oklch(0.992 0 0);
  --fm-panel-deep: oklch(0.19 0.028 255);
  --fm-primary: oklch(0.18 0.025 255);
  --fm-primary-soft: oklch(0.94 0.008 255);
  --fm-evidence: oklch(0.62 0.13 215);
  --fm-evidence-soft: oklch(0.93 0.04 215);
  --fm-success: oklch(0.53 0.13 155);
  --fm-warning: oklch(0.7 0.13 78);
  --fm-danger: oklch(0.55 0.17 28);
}
```

Color use:

- White and cool neutral surfaces dominate.
- Carbon primary is for decisive actions and selected work states.
- Red/orange is reserved for validation failure, never brand decoration.
- Evidence blue is for source links and active field tracing.
- State colors belong only to validation and confidence.

## Typography

Use a system sans stack for product reliability:

```css
font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
```

No display-font theatrics inside the product. Hierarchy comes from spacing, weight, proximity, document scale, and side-by-side evidence.

## Layout

Core app layout:

- Top command bar, not a heavy left-nav dashboard.
- Left document queue as a narrow stack of real file artifacts.
- Center document bench for page rendering and source marks.
- Right extraction rail for field values and confidence.
- Bottom validation drawer for math/rule failures.

Public site layout:

- First viewport shows the product workflow immediately.
- Use one strong interactive-looking product scene instead of repeated feature cards.
- Avoid a hero-metric section.

## Components

- Document bench: central white page on a cool neutral scanner surface.
- Evidence marks: thin, precise outlines connected to field rows.
- Field rows: compact, editable, confidence/evidence visible.
- Validation strip: formula, expected value, actual value, severity.
- Schema composer: field chips, rule rows, and suggestion queue.

## Motion

Motion is restrained and functional:

- field hover highlights matching source mark
- validation drawer open/close
- upload progress and OCR stage transitions

No page-load choreography or scroll-fade sequences.
