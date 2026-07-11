# Member Timer (`/timer`) — Automation (Page Object Model)

Standalone Playwright suite (deliberately **outside** the pnpm workspace — see
`pnpm-workspace.yaml`, which only includes `apps/*` and `packages/*`). Targets the
deployed app directly; no local dev server required.

Source: [../../specs_qa/timer-member.md](../../specs_qa/timer-member.md) (test plan, 63
scenarios / 33 ACs) and
[../../specs_qa/timer-member-exploratory-results.md](../../specs_qa/timer-member-exploratory-results.md)
(exploratory findings — a clean pass, 37 confirmed-working scenarios / 26 not-verified /
0 failures, so this suite automates the 37 confirmed-working scenarios as normal
pass-expected tests, not defect-regression tests). See `HEALING_LOG.md` for the run
history.

## Setup

```bash
cd Test/timer-member
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
  login.page.ts             # Minimal login helper (copied from dashboard-member's,
                             # per that suite's own convention of not sharing page
                             # objects across Test/* modules)
  timer.page.ts              # Start Timer / Tracking Time cards, keyboard shortcuts'
                             # on-screen hints, Daily Progress (gauge, 7-day grid,
                             # milestones), Yesterday summary, Pinned Favorites,
                             # Recent Activity, plus ensureTimerStopped() test-hygiene
                             # guard and a Time Tracker cleanup helper for real entries
                             # this suite creates
tests/
  timer-controls.spec.ts        # TM-001–003, 006, 007, 009, 011, 015–017, 019, 021,
                                 # 022, 024: access/header copy, Project/Task selector
                                 # gating, start/pause/resume/stop mechanics, Note field
  keyboard-shortcuts.spec.ts     # TM-026–035: Space/Ctrl+Shift+T/Shift+Space, on-screen
                                 # hints, live tab-title updates
  daily-progress.spec.ts         # TM-045–047, 049, 050, 057: gauge, daily-goal inline
                                 # edit, 7-day grid + milestone tooltips, Yesterday strip
  favorites-and-recent.spec.ts   # TM-051–055: Pinned Favorites pin/unpin/repopulate,
                                 # Recent Activity chips
  cross-cutting.spec.ts          # TM-044, 059: /timer/active polling mechanism,
                                 # workspace-scoping request headers
```

## Test-hygiene guard: `TimerPage.ensureTimerStopped()`

Every spec file's `beforeEach` calls `TimerPage.ensureTimerStopped()` before each test —
same pattern as dashboard-member's `DashboardPage.ensureTimerStopped()`. If a prior test
(in this file or elsewhere in the suite) failed before reaching its own stop/cleanup step,
it can leave the account with a running or paused timer, which then breaks every
subsequent test expecting the idle "Start Timer" card. The guard navigates to `/timer` and
clicks "Stop & save" if it's visible (which it is in both the tracking AND paused states
on this page), so every test starts from a guaranteed-idle state regardless of what a
prior test left behind.

## Real time-log entries this suite creates

Most tests here start and stop a real timer against the shared QA account
(`peter123@yopmail.com` / "Integritas" / "Aimswebplus"). Two tests type an identifiable
Note ("QA automation - timer-member ...") and delete the resulting TimeLog entry
afterward via `TimerPage.deleteTimeTrackerEntriesContaining()` (mirrors
dashboard-member's `deleteActivityFeedEntriesContaining()`, adapted to Time Tracker's
"Entry actions" menu -> Delete -> confirm-dialog flow). The remaining tests (keyboard
shortcuts, gating checks) don't type a Note, so they leave small (0.00–0.02h) untagged
"Testing"/"Meeting" entries — consistent with pre-existing artifacts already in this same
shared account from other suites' runs; not cleaned up individually since they're
indistinguishable from that existing noise and carry no real data-integrity risk.

## What's covered

37 of the 63 planned scenarios are automated: exactly the live-grounded/PASS scenarios
from the Step 3 exploratory pass. This was a **clean** exploratory pass (0 failures/
discrepancies), so every test here is a normal pass-expected regression test, not a
defect-regression test (contrast with dashboard-member, which had 3 new defect findings
to regress against).

**Not automated** (same reasons the exploratory session couldn't walk them live — see
`specs_qa/timer-member-exploratory-results.md`):

- TM-004, 012, 013, 060 — need a second device/session/workspace to produce a genuine
  concurrent-timer conflict
- TM-005, 008 — need a zero-project / zero-task account variant
- TM-010, 023 — request round-trips complete too fast to reliably capture a transient
  busy/disabled label
- TM-014, 041 — need an impersonation ("view as member") session
- TM-018, 025, 062 — need a second (admin) session mutating data concurrently
- TM-020 — needs a Jira-connected account with "In Progress" issues
- TM-036–043 — need an 8+ hour idle window (soft threshold) or an even longer window past
  the hard auto-stop ceiling
- TM-048 — needs the account well at/above its daily target (this account stays under)
- TM-056, 058 — need a zero-recent-activity / zero-logged-yesterday account
- TM-061 — needs a real tab-blur/focus cycle with precise refetch-call detection
- TM-063 — inherently unfalsifiable from a single-account session (code-verified only)

## A note on assertion style

Daily Progress / Yesterday-summary assertions are shape-based (regexes matching the
documented format) rather than pinned to this session's exact numbers or dates (e.g.
"56%", "4.51 hrs", "Jul 9", "14h 39m") — those values are real, live data in a shared QA
account and drift both with the calendar date and with whatever else is run against the
account between suite runs. Pinning literal values would make the suite fail for reasons
that have nothing to do with a real regression.
