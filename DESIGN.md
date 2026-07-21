---
name: DriftGuard
description: AI runtime safety for Terraform and Kubernetes — scans every PR for security findings in under 2 seconds.
colors:
  canvas: "#07080a"
  surface: "#0c0e12"
  surface-raised: "#11141a"
  surface-overlay: "#161a20"
  border: "#1a1e25"
  border-strong: "#262b34"
  border-bright: "#3a414d"
  fg: "#e8eaed"
  fg-muted: "#9aa0a6"
  fg-subtle: "#525c6b"
  fg-faint: "#3a3f48"
  alert-electric: "#3f8cff"
  alert-electric-bright: "#62a0ff"
  alert-electric-dim: "#1e4d8e"
  cyan: "#06b6d4"
  purple: "#a78bfa"
  severity-critical: "#ff4757"
  severity-high: "#ff8800"
  severity-medium: "#ffb020"
  severity-low: "#525c6b"
  signal-allowed: "#22d38d"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 500
    letterSpacing: "0.18em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.12em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.alert-electric}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.alert-electric-bright}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  panel-raised:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  severity-badge-critical:
    backgroundColor: "{colors.severity-critical}"
    textColor: "{colors.fg}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  severity-badge-high:
    backgroundColor: "{colors.severity-high}"
    textColor: "{colors.fg}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  severity-badge-medium:
    backgroundColor: "{colors.severity-medium}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
---

# Design System: DriftGuard

## 1. Overview

**Creative North Star: "The Zero-Noise Terminal"**

DriftGuard is a tool that speaks like a senior engineer: no noise, high signal. Every pixel earns its place by reducing time-to-decision. The visual system is built from the terminal outward — a near-void canvas, surfaces that stack in tonal layers, and a single electric accent that fires only when something needs attention. When the accent appears, it is the finding. When the surface is dark and still, the system is waiting. That quiet is not empty; it is the default state of a tool that trusts the user to know what silence means.

Typography is information-first: Inter at tight weights for structure, Geist Mono in uppercase for operational labels (rule IDs, severity codes, file paths). The monospace layer is the second voice of the system — it never decorates, it classifies. Density is a feature. The dashboard does not breathe generously; it holds more signal per viewport, because the users who live here want it that way.

This system explicitly rejects the compliance-portal aesthetic: stiff data tables, navy/corporate palettes, copy written for auditors rather than engineers. DriftGuard is a live operational instrument, not a report generator. It also rejects the opposite failure — SaaS chart overload, hero-metric grids, gradient text, "Streamline your workflow" copy inside the product UI.

**Key Characteristics:**
- Dark-native: calibrated for terminal environments, not retrofitted from a light theme
- Tonal depth: five surface layers (canvas → surface → raised → overlay → modal) with no shadows as structure
- Electric accent as operational signal: appears on active states, primary actions, and live indicators only
- Severity palette as a second signal system: critical/high/medium/low each carry their own unmistakable hue
- Mono labels as a classification layer: uppercase Geist Mono at 10–11px for rule IDs, statuses, file references
- Motion is sparse and purposeful: slide-up reveals, glow pulses, scan animations — never decorative

## 2. Colors: The Terminal Signal Palette

Five surface layers plus two signal systems. The palette earns its range by being functional, not decorative.

### Primary
- **Alert Electric** (`#3f8cff`): The sole primary accent. Used on primary buttons, active nav states, hover glows, live status indicators, and the scan-line animation. Its rarity is its power — when it appears, something is active or actionable.
- **Alert Electric Bright** (`#62a0ff`): Hover state only. Not used at rest.
- **Alert Electric Dim** (`#1e4d8e`): Background tint behind electric text; pressed/active state for electric elements.

### Secondary
- **Signal Allowed** (`#22d38d`): Policy pass state, check-run success, "allowed" badge. Appears only on positive operational signals.
- **Cyan** (`#06b6d4`): Secondary informational accent; used for info-level status and certain data-viz roles.
- **Purple** (`#a78bfa`): Tertiary accent for AI/semantic memory surfaces. Distinguishes AI-generated content from deterministic findings.

### Tertiary — Severity Scale
The severity palette is a classification system, not a mood. Each value is a specific operational state.
- **Severity Critical** (`#ff4757`): IAM wildcards, public S3, RDS publicly accessible. The most urgent signal in the system. Also doubles as `signal-blocked`.
- **Severity High** (`#ff8800`): force_destroy, open security groups, unpinned GHA actions.
- **Severity Medium** (`#ffb020`): Missing encryption, missing limits, root containers. Also doubles as `signal-warned`.
- **Severity Low** (`#525c6b`): Missing probes, writable root FS. Rendered in `fg-subtle` — informational, not urgent.

### Neutral
- **Void Black** (`#07080a`): Canvas. The base layer. Never used as text.
- **Terminal Surface** (`#0c0e12`): Primary card and panel background.
- **Lifted Surface** (`#11141a`): Raised panels, dropdowns, popovers — one step above surface.
- **Overlay Surface** (`#161a20`): Modal and command palette backgrounds.
- **Grid Line** (`#1a1e25`): Default border. Barely visible; defines without dividing.
- **Structure Border** (`#262b34`): Interactive element borders (buttons, inputs). Visible but not loud.
- **Bright Border** (`#3a414d`): Hover state border for interactive elements.
- **Primary Foreground** (`#e8eaed`): All body text, headings, interactive labels.
- **Muted Foreground** (`#9aa0a6`): Secondary text, descriptions, timestamps.
- **Subtle Foreground** (`#525c6b`): Placeholder text, severity-low badges, mono labels.
- **Faint Foreground** (`#3a3f48`): Disabled states, ghost text.

**The One Voice Rule.** Alert Electric is used on ≤10% of any given screen surface. It signals action and live state. If everything is electric, nothing is.

**The Severity Exclusivity Rule.** Severity colors appear only on severity badges, finding rows, and severity-scoped charts. They are never repurposed as decorative accents, hover states, or branding elements.

## 3. Typography

**Body Font:** Inter (with `ui-sans-serif, system-ui` fallback)
**Label / Code Font:** Geist Mono (with `ui-monospace, monospace` fallback)

**Character:** Inter at tight weights reads as engineered, not editorial. Paired with Geist Mono for operational classification, the combination maps exactly to how engineers already read tooling: prose for narrative, mono for machine-readable data.

### Hierarchy
- **Display** (600 weight, `clamp(2.25rem, 5vw, 3.5rem)`, lh 1.1, ls -0.02em): Landing page hero only. Never used inside the dashboard.
- **Headline** (600 weight, 1.25rem/20px, lh 1.3): Page titles, section headings within the dashboard, modal titles.
- **Title** (500 weight, 0.9375rem/15px, lh 1.4): Card headings, panel titles, table column headers.
- **Body** (400 weight, 0.875rem/14px, lh 1.6): All descriptive text, finding messages, incident descriptions. Max line length 65–75ch.
- **Label** (Geist Mono, 500 weight, 0.625rem/10px, ls 0.18em, UPPERCASE): Section eyebrows where used (sparingly), field labels, status identifiers.
- **Mono** (Geist Mono, 500 weight, 0.6875rem/11px, ls 0.12em, UPPERCASE): Rule IDs (TF013, K8S001), file paths, commit SHAs, API keys.

**The Mono Classification Rule.** Geist Mono in uppercase never carries prose. It identifies: rule codes, file references, severity levels, timestamps. If it would read as a sentence, it is wrong.

**The Base-14 Rule.** Body text is 14px minimum. The dashboard is dense but not illegible. 12px appears only in secondary labels (`dg-label`) where mono and uppercase together compensate for reduced size.

## 4. Elevation

DriftGuard uses tonal layering exclusively. Surfaces gain depth by shifting background lightness, not by casting shadows. This matches the terminal paradigm: a terminal has no drop shadows; it has foreground, background, and what is highlighted.

**The Five Layers:**
1. **Canvas** (`#07080a`) — page background, never a container
2. **Surface** (`#0c0e12`) — primary cards, panels, table rows
3. **Raised** (`#11141a`) — nested cards, dropdowns, popovers
4. **Overlay** (`#161a20`) — modals, command palette, drawers
5. **Modal/Toast** — uses Raised + `backdrop-filter: blur(12px)` + subtle electric vignette

**Structural shadows are prohibited.** The only permitted shadow effects are:
- **Interactive state glow** (`0 8px 32px -8px rgba(63,140,255,0.12)` + border shift to `rgba(63,140,255,0.25)`): applied on `.dg-card-hover:hover`. State-driven, not decorative.
- **Primary button bloom** (`0 0 0 1px rgba(63,140,255,0.4), 0 8px 24px -6px rgba(63,140,255,0.4)`): always-on ambient ring around `.dg-button-primary`. Communicates importance, not depth.
- **Panel inset** (`0 1px 0 0 var(--dg-border) inset`): subtle bottom-border on panel elements. Structural, 1px only.

**The Flat-By-Default Rule.** Shadows appear only as state responses (hover, active) or as importance signals (primary button). A surface at rest casts no shadow. If you're adding a box-shadow to a resting state, stop and use a tonal layer instead.

## 5. Components

### Buttons
**Shape:** Gently rounded (6px / `rounded-lg`). Not pill, not square.

- **Primary (`.dg-button-primary`):** Alert Electric background (`#3f8cff`), white text, `px-3.5 py-2` (14px × 8px). Ambient electric ring (`0 0 0 1px rgba(63,140,255,0.4), 0 8px 24px -6px rgba(63,140,255,0.4)`). Hover: brightens to `#62a0ff`, bloom shadow expands. Active: `scale(0.97)` at 80ms. Focus-visible: 2px `#3f8cff` outline with 2px offset.
- **Ghost (`.dg-button-ghost`):** Transparent background, `fg` text, `border-strong` border. Hover: border lifts to `border-bright`, surface tint on background. Same active and focus treatments as primary.
- **No tertiary or text-link button variants.** Links inside body copy use `text-[color:var(--dg-electric)]` with no button treatment.

### Panels / Cards
- **Base Panel (`.dg-panel`):** `surface` background, `border` (1px), `rounded-md` (4px), `p-4` (16px).
- **Raised Panel (`.dg-panel-raised`):** `surface-raised` background, `border-strong`, same radius and padding.
- **Interactive Panel (`.dg-card-hover`):** Adds hover: `translateY(-2px)`, electric glow shadow, border shifts to `rgba(63,140,255,0.25)`. Transition: 180ms ease-out.
- **Nested cards are never used.** A panel inside a panel is a layout failure.

### Severity Badges
Mono labels in 10px uppercase, pill-shaped at 2px radius. Backgrounds are tinted (15% opacity) versions of the severity color; text is the full severity color at full opacity. This prevents the badge from being too loud while keeping the classification unmistakable.

- Critical: `rgba(255,71,87,0.15)` bg, `#ff4757` text
- High: `rgba(255,136,0,0.15)` bg, `#ff8800` text
- Medium: `rgba(255,176,32,0.15)` bg, `#ffb020` text
- Low: `rgba(82,92,107,0.25)` bg, `#9aa0a6` text (severity-low matches fg-subtle)

### Finding Rows (Signature Component)
The finding row is the most-read component in the dashboard: `badge | rule-id | message | file:line`.

- Row: `surface` bg, `border` bottom, `px-4 py-2.5` (16px × 10px). Hover: lifts to `surface-raised` via `background` transition only (no transform — rows are too dense for physical hover lift).
- Rule ID: Geist Mono, 11px, uppercase, `fg-subtle` — the code (TF013, K8S001) is a classifier, not a headline.
- Message: Inter 13px, `fg` — the most important text in the row. `text-overflow: ellipsis` on constrained widths.
- File path: Geist Mono, 11px, `fg-subtle` — secondary location reference.

### Mono Labels (`.dg-label` / `.dg-mono`)
- `.dg-label`: 10px Geist Mono, uppercase, ls 0.18em, `fg-subtle`. Section identifiers, field labels.
- `.dg-mono`: 11px Geist Mono, uppercase, ls 0.12em, `fg-subtle`. Rule codes, machine-readable identifiers.
- Neither wraps. Single-line always. Truncate with ellipsis if space is constrained.

### Navigation
Top-level dashboard nav uses `DashboardNav` component. Active item: `fg` text + left indicator in `alert-electric`. Hover: `surface` background tint. The nav transition overlay uses a full-screen backdrop (`rgba(7,8,10,0.92)` + blur 12px) with a scan-line animation in Alert Electric during loading transitions.

## 6. Do's and Don'ts

### Do:
- **Do** use Alert Electric exclusively for actionable and live-state signals. Its rarity is its meaning.
- **Do** use Geist Mono uppercase for all machine-readable identifiers: rule IDs, file paths, commit SHAs, severity codes. Prose never appears in mono.
- **Do** express depth through tonal surface layers. When you need "deeper", use `surface-raised`; when you need "floating", use `overlay` + blur.
- **Do** use severity colors only in their designated role: findings, badges, severity-scoped charts. Never as decorative accents or hover treatments.
- **Do** keep finding row hover state as a background transition only. Dense data tables do not lift physically on hover.
- **Do** include `prefers-reduced-motion` fallbacks for every animation. The motion system has them globally (`animation-duration: 0.01ms`), but new animations must opt in explicitly.
- **Do** size primary buttons at 13px font-weight 500 with `px-3.5 py-2`. The compact size is intentional — this is a tool, not a marketing surface.
- **Do** use `text-wrap: balance` on headings (h1–h3) and `text-wrap: pretty` on multi-line body paragraphs.

### Don't:
- **Don't** use the compliance-portal aesthetic. No navy/corporate palette, no stiff audit-table layouts, no copy written for regulators rather than engineers. DriftGuard is a live operational instrument.
- **Don't** use gradient text (`background-clip: text` with a gradient). Severity and status are communicated through solid color, not decorative gradients.
- **Don't** add structural box-shadows to resting surfaces. The `panel` and `panel-raised` components have no box-shadow at rest. Shadows are state-only (hover, active) or importance-only (primary button bloom).
- **Don't** use `border-left` greater than 1px as a colored stripe on cards or list items. Finding severity is shown with the badge, not a side accent bar.
- **Don't** put glassmorphism (`backdrop-filter: blur`) on anything except the nav-transition overlay and modals. Decorative blur on cards or panels reads as noise in a dense dashboard.
- **Don't** use chart overload. Surface the 3–5 metrics that change a decision. Every chart that doesn't change what the user does next is a compliance-portal reflex.
- **Don't** use eyebrows (small uppercase tracked text above every section heading) as default scaffolding inside the app. Mono labels exist for a specific classification role; they are not section decoration.
- **Don't** soften severity. Critical findings are `#ff4757`. They are not amber. They are not orange. If the severity is critical, the color is critical.
- **Don't** use Alert Electric on decorative or ambient elements (borders, background tints on resting cards, non-interactive text). It signals action. Dilution destroys the signal.
