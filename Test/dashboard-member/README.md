# Member Dashboard — Automation (Page Object Model)

Standalone Playwright suite (deliberately **outside** the pnpm workspace — see
`pnpm-workspace.yaml`, which only includes `apps/*` and `packages/*`). Targets the
deployed app directly; no local dev server required.

Source: [../../specs_qa/dashboard-member.md](../../specs_qa/dashboard-member.md) (test
plan, 66 scenarios / 30 ACs) and
[../../specs_qa/dashboard-member-exploratory-results.md](../../specs_qa/dashboard-member-exploratory-results.md)
(exploratory findings that shaped these scripts, including the 3 new defect-regression
tests). See `HEALING_LOG.md` for the run history.

## Setup

```bash
cd Test/dashboard-member
npm install
npx playwright install chromium
cp .env.example .env   # then fill in TEST_USER_EMAIL / TEST_USER_PASSWORD
```

`.env` is gitignored — never commit real credentials, even for a test account.

## Run

```bash
npm test              # headless
npm run test:headed   # watch it run
npm run report         # open the last HTML report
```

## Structure

```
pages/
  login.page.ts             # Minimal login helper (mirrors login-forgot-password's)
  dashboard.page.ts          # Header, Period/Range, Scope filters, KPI cards, charts,
                             # donuts, Quick Timer, Daily Progress, Activity Feed,
                             # Team Activities
  widget-catalog.page.ts     # "Customize Dashboard" slide-over (Add Widgets panel)
  arrange-grid.page.ts       # Arrange Grid edit mode + REAL mouse-based drag mechanic
tests/
  dashboard-access.spec.ts       # AC-1–AC-5: access/role scope, header controls
  period-range-filters.spec.ts   # AC-6–AC-13: Period/Range + Scope filters (positive paths)
  kpi-and-widgets.spec.ts        # AC-14–AC-22: KPI cards, chart, donuts, Daily Progress,
                                  # Activity Feed, Team Activities, hidden widgets
  quick-timer.spec.ts            # AC-18: Quick Timer gating + real start/stop flow
  widget-customization.spec.ts   # AC-23–AC-25: Add Widgets panel, toggles, Reset Layout
  arrange-grid.spec.ts           # AC-26–AC-27: Arrange Grid mode incl. REAL drag-and-drop
  cross-cutting.spec.ts          # AC-28, AC-30: loading state, console/API errors
  defect-regressions.spec.ts     # NEW findings (DM-008, DM-011/023/026, DM-031) —
                                  # expected to fail until fixed; see HEALING_LOG.md
```

## A note on the Arrange Grid drag mechanic

The Step-3 exploratory session (Playwright MCP) could **not** get a simulated drag to
register against `react-grid-layout` at all — neither the MCP drag tool nor manually
dispatched mouse events moved a widget (see the exploratory-results.md notes on
DM-056/057). That was a tooling limitation, not a product defect: the source doc's own
prior live QA pass had already established the drag/resize/save mechanic works.

`ArrangeGridPage.dragItem()` in this suite uses a **real** `page.mouse.move()` →
`down()` → many incremental `move()` calls → `up()` sequence instead of a single jump or
a synthetic `dispatchEvent`. This was verified live while building this suite: a grid
item's inline `transform` genuinely changed from `translate(0,0)` to `translate(388,0)`,
pushed sibling widgets down, persisted after `mouseup`, and correctly reverted when
Cancel was clicked. `tests/arrange-grid.spec.ts` exercises this against real
Save/Save-as-default/Reset/Cancel actions — it's the automated proof that AC-26/27's
drag-and-resize mechanic actually works, not just that the toolbar renders.

## What's covered

Roughly 45 of the 66 planned scenarios are automated: the live-grounded/PASS scenarios
from Step 3, the known-gap scenarios that reproduce exactly as documented (written as
passing tests that document current, accepted behavior — same convention as
login-forgot-password's LGN-12/13), and the 3 brand-new defect regressions.

**Not automated** (same reasons the exploratory session couldn't walk them live):

- DM-030 (409 timer conflict) — needs a second device/session starting a second timer
- DM-033 (8-hour idle alert) — needs an 8-hour idle timer window
- DM-047 (0-match filter category empty state) — no category in the current registry
  yields 0 matches
- DM-058, DM-062, DM-063 — need a second Member account and/or a second workspace
  membership, unavailable on this seeded account
- DM-065 — needs a second device/tab to produce a stale `X-Workspace-Id`; also an
  auth-layer behavior, not dashboard-specific

## Defect-regression tests (expected to fail until fixed — this is intentional)

- `[DEFECT][DM-008]` — Total Hours (Today) heading renders twice when Period = Today
- `[DEFECT][DM-011/023/026]` — a past/future custom date range silently gets widened to
  include today for `/timelogs`-backed widgets, showing stale non-zero data instead of
  the correct empty state (Team Activities, a separately-implemented endpoint, does NOT
  have this bug — the two widgets visibly contradict each other for the same picked range)
- `[DEFECT][DM-031]` — Today's Activity Feed / Total Hours (Today) KPI don't auto-refresh
  within 5s of stopping a Quick Timer (only a manual reload picks up the new entry)

Known, already-filed gaps reproduced as normal (passing) tests documenting current
behavior, not re-filed: #720/#721 (KPI stats), #618 (Team Activities sparkline), #654
(Quick Timer button/labels), #657 (no "Inactive" badge), #733 (Arrange Grid toolbar
button count). See each test's comment for the issue number and exact wording gap.
