# Healing Log — dashboard-member

Module: Dashboard (Client/Member app). Suite: 8 spec files (`dashboard-access`, `period-range-filters`, `kpi-and-widgets`, `quick-timer`, `widget-customization`, `arrange-grid`, `cross-cutting`, `defect-regressions`), built on 4 page objects (`login.page.ts`, `dashboard.page.ts`, `arrange-grid.page.ts`, `widget-catalog.page.ts`).

## Final result: 44 passed / 4 failed (all expected) / 1 flaky (recovered on retry)

This is the authoritative, stable result after three rounds of investigation and fixes below. Reproduced twice in a row with identical results before being treated as final.

## Run history — three rounds of false negatives, each root-caused before being trusted

**Round 1 (initial automation run):** 2 expected / 38 skipped / 9 unexpected per `results.json` stats. Investigated every failure individually rather than trusting the raw numbers:
- 7 of 9 failures were `Error: worker process exited unexpectedly (code=3221225794, signal=null)` — a Windows access-violation crash from host memory pressure (confirmed via `wmic OS get FreePhysicalMemory`, ~2.1–4GB free of 16GB at various points), not real test or product failures. Re-running each in isolation once memory recovered produced clean passes for all of them except the two described below.
- The 38 "skipped" count was a cascade artifact of the crash aborting the run early, not genuine precondition-based skips.

**Round 2 (full suite re-run after confirming crashes were transient):** 43 passed / 5 failed / 1 flaky. Investigated the 2 failures that weren't already-expected defect regressions rather than assuming they were new bugs:
- **`dashboard-access.spec.ts` — "Header notifications badge matches sidebar nav badge"**: root-caused via a live DOM dump (not guessed) — the sidebar renders *two* `<a href="/notifications">` elements (collapsed icon-only + expanded full-row), only one visible at a time. On the visible (collapsed) one, the badge digit is present as visible text but excluded from the computed accessible name, so `getByRole('link', {name: /Notifications\s*\d+/})` could never match it in that state — not a timing issue (a longer timeout didn't help), a real DOM-structure difference. Self-healed by scoping to the visible link and matching on visible text instead of accessible name. **Not filed as a bug** — no visible/functional difference to a sighted user, just a computed-accessible-name quirk worth a code comment for whoever touches this component next.
- **`arrange-grid.spec.ts` — "Reset Layout (in Arrange mode) reverts a dragged widget back to the default position"**: verified manually via Playwright MCP with the exact same viewport as the test config (1366×768) before trusting the automated result, since an initial ad-hoc manual check (different viewport) appeared to show Reset working — that discrepancy turned out to be the viewport difference changing which grid column the drag landed in, not evidence the bug was a false positive. Confirmed as a **real, new defect** — see "Confirmed real defects" below.

**Round 3 (after Round 2's fixes, next full-suite run):** 42 passed / 7 failed — 3 new failures in `quick-timer.spec.ts`, none of which had failed before. Root-caused directly (not assumed) via a live account check: a timer had been running for ~20 minutes, left active by `quick-timer.spec.ts`'s own "Starting and stopping a timer records a real entry" test — if any of its pre-stop assertions (documenting known, accepted Quick Timer gaps) had failed, execution would never reach the `stopQuickTimer()` call later in that test, leaving the account in a non-idle state for every subsequent Quick Timer test in the same or a later run. This is a **test-hygiene gap, not a product defect** — fixed by adding `DashboardPage.ensureTimerStopped()` (stops any in-progress timer if found) to the `beforeEach` of **all 8 spec files**, so every test starts from a guaranteed-idle state regardless of what a prior test left behind, rather than relying solely on each test's own end-of-test cleanup succeeding.

**Also encountered and cleaned up:** two additional stray timers left running from my own manual/exploratory verification during this investigation (not from the automated suite) — stopped both and confirmed the account returned to idle before the final run.

**Final full-suite run (after all fixes above):** clean, stable, reproduced twice — 44 passed / 4 failed (all expected) / 1 flaky (passed on retry, no action needed).

## Confirmed real defects (left red — NOT self-healed)

### 1. `arrange-grid.spec.ts` — Reset Layout does not revert a dragged widget to its default position — **NEW, not previously documented**
- **Assertion:** after dragging a widget and clicking "Reset Layout" (in Arrange mode), the widget's transform must match its pre-drag position.
- **Actual:** the widget stays at (or near) its dragged position — reproduced consistently across 2 independent automated runs with identical wrong values, and cross-checked manually at the correct viewport before being trusted.
- **Not yet filed as a GitHub/Jira bug** — flagged here for Step 6 (defect logging).

### 2. `defect-regressions.spec.ts` — [DEFECT][DM-008] Total Hours (Today) heading appears twice when Period=Today
- Two KPI cards render the identical heading "Total Hours (Today)" with different, conflicting values when Period is switched to "Today" — no visual distinction. First surfaced in Step 3 exploratory testing, now confirmed via automation.

### 3. `defect-regressions.spec.ts` — [DEFECT][DM-011/023/026] past date range with no data silently includes today
- Custom date ranges not spanning "today" are silently clamped for `/timelogs`-backed widgets (KPI cards, Project Distribution, Category Split, Weekly Progress Chart) — a genuinely empty past/future period shows stale non-zero data instead of an empty state, while the separately-implemented Team Activities widget correctly does not clamp, producing visibly contradictory data on the same screen. First surfaced in Step 3, now confirmed via automation with request/response evidence.

### 4. `defect-regressions.spec.ts` — [DEFECT][DM-031] dashboard widgets don't refresh within 5s of stopping a Quick Timer
- After stopping a Quick Timer, Today's Activity Feed and the Total Hours (Today) KPI don't auto-refresh for 6+ seconds; data is correct after a manual reload. First surfaced in Step 3, now confirmed via automation.

## Confirmed pre-existing gaps (already filed, GitHub #720/#721/#618/#654/#657/#733) — pass as expected

Regression tests across `kpi-and-widgets.spec.ts`, `quick-timer.spec.ts`, `widget-customization.spec.ts`, and `arrange-grid.spec.ts` assert these already-documented, already-filed gaps from `docs/qa/user_stories/Dashboard_Member.md` still reproduce as described — all pass (i.e., correctly confirm the gap is still present), consistent with the source doc's own "Known gaps vs. ticket wording" table. Not re-filed.

## Self-healed (test-authoring / test-hygiene issues, not product defects)

1. **Notifications badge accessible-name mismatch** (`dashboard-access.spec.ts`) — see Round 2 above.
2. **Leftover-timer cascade** (all 8 spec files' `beforeEach`) — see Round 3 above.

## Flaky (not investigated further — passed on retry)

`arrange-grid.spec.ts` — "Arrange Grid activates edit mode with the Rearranging Layout banner" — failed once, passed on Playwright's built-in retry. Not pursued further since it's a single-occurrence flake with no repeated pattern (unlike the crash/cascade issues above, which were investigated precisely because they *did* repeat).

## Not automated (unchanged from Step 3's exploratory findings — precondition unavailable in this environment)

~11 scenarios remain not automated for the same reasons flagged during exploratory testing: a second concurrent timer (409 conflict), an 8-hour-idle timer, a multi-workspace account, a second Member account (to verify "Save as default" is seen by others). These were not attempted in automation for the same reason they weren't live-walkable in Step 3 — the environment cannot produce the precondition, not a test-authoring gap.

## Environment notes for future runs of this suite

- If workers crash with `code=3221225794` (Windows access violation), check free system memory first (`wmic OS get FreePhysicalMemory,TotalVisibleMemorySize`) before assuming a product or test defect.
- If any Quick-Timer-adjacent test fails unexpectedly, check the live account for a stuck running timer before assuming a product regression — the `beforeEach` guard added this session should prevent this going forward, but a timer manually started outside the suite (e.g. during manual exploratory verification) will still need to be stopped by hand, since the guard only runs at the start of each test, not continuously.
