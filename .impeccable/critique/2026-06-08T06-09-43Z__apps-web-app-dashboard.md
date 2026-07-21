---
target: apps/web/app/dashboard
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-06-08T06-09-43Z
slug: apps-web-app-dashboard
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Nav active indicator is 4px-wide 1px line — barely visible |
| 2 | Match System / Real World | 3 | "Memory" not self-evident to new users |
| 3 | User Control and Freedom | 2 | Incident rows look clickable but aren't; no undo after policy delete |
| 4 | Consistency and Standards | 3 | Stats strip uses text-xl while detail values use text-[13px] |
| 5 | Error Prevention | 2 | Policy edit: no validation; conditions keys have no affordance |
| 6 | Recognition Rather Than Recall | 2 | PolicyCard actions opacity-0 at rest |
| 7 | Flexibility and Efficiency | 3 | ⌘K palette with keyboard shortcut |
| 8 | Aesthetic and Minimalist Design | 3 | Stats strip edges toward hero-metric template |
| 9 | Error Recovery | 2 | Raw API d.detail shown; no recovery path |
| 10 | Help and Documentation | 2 | No contextual help on conditions; no ⌘K discovery |

Total: 25/40

## Anti-Patterns Verdict
Does NOT read as AI-generated. Token discipline is strong throughout. Compliance-portal aesthetic successfully avoided. One near-miss: stats strip 6×(text-xl number / text-[9px] label) is one step from banned hero-metric template. Automated scan: clean ([]).

## Overall Impression
Functional, on-brand. Biggest problem: PolicyCard hides all actions behind opacity-0 group-hover — invisible to keyboard users and first-timers. Second: incident rows have hover styles but no href (false affordance).

## What's Working
1. Token discipline — every value traces to a CSS custom property
2. Layered surface usage — canvas→surface→raised used correctly
3. Empty states — RecentAnalyses has two contextually distinct empties with relevant CTAs

## Priority Issues
[P1] PolicyCard actions opacity-0 at rest — no focus-within fallback. Keyboard users hit invisible buttons.
[P1] Incident rows are non-interactive divs with hover affordance — false affordance, nothing happens on click.
[P2] Stats strip 9px labels — below legible threshold on mobile.
[P2] Active nav indicator: h-px w-4 — insufficient visual weight, users lose location signal.
[P2] PolicyCard enabled dot: color-only, no aria-label.

## Persona Red Flags
Alex: Incident rows not clickable blocks triage workflow from dashboard.
Sam: opacity-0 actions reached by keyboard before visible; enabled dot has no ARIA; 9px labels.
SRE persona: sees incidents but cannot act on them from dashboard.

## Minor Observations
- IncidentsSection returns null for empty — no confirmation of "no incidents" state
- Risk score shows raw number with no threshold context
- Redundant opacity-0 hover arrow on analysis rows (already Link with cursor)
