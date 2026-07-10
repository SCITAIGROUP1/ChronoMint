# Test Plan — Member Dashboard

**Module:** `dashboard-member`
**Target application:** Client / Member app — https://chrono-mint-client.vercel.app/
**Test account:** `peter123@yopmail.com` / `Password1@` (Member role, workspace **"Integritas"**)
**Source of truth:** `docs/qa/user_stories/Dashboard_Member.md` (30 ACs — AC-1 through AC-30 — across 7 numbered sections: Access & role scope; Page header & controls; Period & Range filters; Scope filters; Widget catalog; Layout customization; Cross-cutting/non-functional)

> **Count note:** the task brief for this run described "27 ACs across 6 sections." The source doc itself, read in full, actually contains **30** numbered ACs (AC-1–AC-30) across **7** numbered `##` sections. Per this playbook's guardrails ("every scenario traces to an AC ID, no orphans, no uncovered ACs"), this plan covers all 30, grouped below by feature area — the widget catalog and layout-customization sections are further broken into the same 6 sub-areas the brief named (KPI stat cards, Weekly Progress chart, Project Distribution donut, Team Activities, Quick Timer, and the widget system), plus Category Split / Daily Progress / Today's Activity Feed / hidden-widgets, which the source doc also scopes under "Widget catalog" and which needed their own scenarios to avoid uncovered ACs. This is flagged here rather than silently dropping 3 ACs to match the brief's count.

## Screens/controls confirmed via live exploration (Playwright MCP, session dated in this run)

Live navigation to `/dashboard` while already authenticated as `peter123@yopmail.com` (workspace "Integritas") confirmed the following real selectors/copy — used to ground every scenario below instead of guessing:

| Area | Confirmed live |
|---|---|
| Header | Heading "Dashboard", subtitle "Analyze your weekly progress and customize your widget layout.", buttons **"Add Widgets"** / **"Arrange Grid"**, Help-menu button, Notifications bell (badge showed "3", matching sidebar nav's own "Notifications 3"), Appearance toggle, Settings link, avatar "PS" linking to `/profile` |
| Period/Range | Button group **Today / This week / This month** (This week active by default); Range button labeled "Dashboard date range" showed "Jul 6 – Jul 12, 2026" for This week, "Jul 1 – Jul 10, 2026" for This month |
| Scope filters | Toggle button "Scope filters" (collapsed by default) with helper text "Optional — narrow dashboard widgets"; expands to Project combobox ("All projects"), Category combobox ("All categories"), Task shown as static text "Select a project first" (not a combobox) until a project is chosen |
| KPI cards | "Total Hours (Today)" (0h / 0h billable), "Total Hours (Week)" (14.66 / 12 billable) — **label live-confirmed to change to "Total Hours (Period)" when switching to This month** — "Active Projects" (1 / "Assigned projects") |
| Weekly Progress Chart | Live-confirmed the chart's own heading text changes from **"Weekly Progress Chart"** to **"Progress Chart"** when period ≠ This week (not documented in the source AC text — worth noting for exploratory/automation selector stability). Mon–Sun day labels for This week; day+month labels (e.g. "Jul 1") for This month, confirming AC-15's note that no combined "Tue, Jul 2" format is used. Legend: "billable" / "nonBillable" |
| Project Distribution | Donut with center "14.66h" / "Total Logged"; legend table columns Project / Hours / % — single row "Aimswebplus" / "Pearson" (client) / 14.66h / 100% |
| Category Split | Donut with "14.66h" / "This week" (relabels to "This month" with period) center text, category label "QA" |
| Quick Timer | Project combobox default "Select" (one live option: "Aimswebplus"); Task combobox disabled ("No tasks") until project chosen, then becomes an enabled "Select" combobox; **"Start tracking"** button stays disabled even after picking a project until a Task is also picked — confirmed live by selecting "Aimswebplus" and observing Task ungate but Start tracking remain disabled |
| Daily Progress | Radial ring "0%" / "of target", "0.00 / 8 hrs", "Need 8.00 more hours today." |
| Today's Activity Feed | Empty-state copy: "No time tracked yet today. Hit start and get going." |
| Team Activities | Table columns Member / Latest activity / Duration / Time since / **"This week"** (relabels to "This month" with period) / Hours by day; caption "Respects your dashboard period. Bar height shows daily hours — hover for exact values. Today is highlighted."; confirmed workspace-wide (11 members listed, most "No activity" / "—" / "—" / "0h" / "No hours logged in selected period") |
| Add Widgets panel | Opens as **"Customize Dashboard"** slide-over from the right; "Add Widgets" button toggles to **"Close Catalog"**; header line "Toggle widgets on/off below... drag... resize"; **"Available Widgets (14)"**; pill buttons under "Filter Categories": All Widgets / KPI / Time / Composition / Quick; each widget row shows icon, name, "Active" badge (only on the 10 default-visible ones), description, "Min: NxM \| Default: NxM", and a switch; hidden widgets (Billable Hours, Pinned Favorites, Recent Activity, My Timesheets) show no "Active" badge and an unchecked switch — confirmed no "Inactive" badge exists either; footer buttons **"Reset Layout"** and **"Done Editing"** |
| Arrange Grid mode | "Arrange Grid" button toggles to **"Done Arranging"**; sticky toolbar reads "Rearranging Layout" / "Edit Mode" / "Drag anywhere on a widget to move; drag edges or the corner to resize."; toolbar buttons: **Cancel**, **Reset Layout**, a combined **Save** button + separate **"Save options"** chevron button whose dropdown menu contains exactly two items: **"Save layout"** and **"Save as default"** — confirmed live, matches AC-26's documented gap (no standalone "Done" / "Done and Save as Default") |

## Test data / setup prerequisites

| ID | Data/state needed | Used by | Available this session? |
|---|---|---|---|
| TD-1 | Standard Member account, single workspace "Integritas", has logged time this week (14.66h across 1 project) | Most scenarios below | Yes (`peter123@yopmail.com`) |
| TD-2 | Period/range with zero logged time for the signed-in user (e.g. future date range) | DM-011, DM-022, DM-025 | Yes — reachable via the custom Range picker |
| TD-3 | A second device/session or the `/timer` page, to start a timer and trigger the 409 `TIMER_ALREADY_ACTIVE` conflict from the dashboard widget | DM-028 | Partial — `/timer` page is reachable from the same account; true multi-device concurrency not exercised this session |
| TD-4 | A timer left running/idle for 8+ hours (to test the stale-timer alert gap) | DM-031 | No — would require leaving a real timer running for 8 hours; documented as a known, already-filed gap in the source doc, not freshly discovered |
| TD-5 | Member account belonging to 2+ workspaces (to verify per-workspace layout isolation) | DM-059 | No — `peter123` has exactly one workspace membership ("Integritas") |
| TD-6 | A previously customized (non-default) widget layout, to exercise "Reset Layout" | DM-050 | Yes — can be produced in-session via Arrange Grid / Add Widgets before testing reset |
| TD-7 | A second Member/session to independently verify "Save as default" changes the workspace default seen by other members | DM-055, DM-060 | No — only one seeded Member account available this session |
| TD-8 | A stale `X-Workspace-Id` scenario (switch workspace on another device/tab) | DM-062 | No — single-workspace account; this is an auth/session-layer behavior, not dashboard-specific |
| TD-9 | "My Timesheets" widget enabled with at least one submitted timesheet period | DM-041 | Partial — widget can be enabled live; submission history depends on account's existing data |

Scenarios needing unavailable test data are marked **"Code-verified only / needs setup"** below rather than skipped, per playbook convention.

## Known gaps this plan treats as pre-confirmed (not to be re-discovered as new defects)

Every gap below is already documented with a live-verification date and (where applicable) a GitHub issue number in the source doc's own inline Notes and its "Known gaps vs. ticket wording" table. Scenarios tagged with these are marked **"Expected to fail against literal AC/ticket wording — known gap, already filed as #NNN"** (or "not yet filed" where the doc says so) rather than treated as fresh findings:

| Area | Gap | Filed as |
|---|---|---|
| KPI stats (AC-14) | No workspace-wide "Active Projects" count | [#720](https://github.com/SCITAIGROUP1/ChronoMint/issues/720) — Open |
| KPI stats (AC-14) | Decimal hours, not `HH:MM:SS` | [#721](https://github.com/SCITAIGROUP1/ChronoMint/issues/721) — marked Completed, re-verified failing 2026-07-01 |
| Weekly Progress Chart (AC-15) | No per-project segmentation/tooltip/X-axis format/prev-next arrows | Not yet filed (as of 2026-06-18) |
| Team Activities (AC-21) | Vertical single-color daily sparkline, not stacked horizontal per-project bar | [#618](https://github.com/SCITAIGROUP1/ChronoMint/issues/618) — Open |
| Quick Timer (AC-18) | Button labels / no animated ring / extra Pause control | [#654](https://github.com/SCITAIGROUP1/ChronoMint/issues/654) — Open |
| Quick Timer (AC-18) | No confirmation-dialog prompt text for 2nd active timer (toast instead) | [#655](https://github.com/SCITAIGROUP1/ChronoMint/issues/655) — Open |
| Quick Timer (AC-18) | No post-Stop description dialog (inline Note field instead) | [#656](https://github.com/SCITAIGROUP1/ChronoMint/issues/656) — Open |
| Quick Timer (AC-18) | 8-hour idle alert doesn't fire from dashboard widget | Not yet filed (as of 2026-06-19) |
| Add Widgets panel (AC-23) | No "No widgets available." empty state for 0-match filter | Not yet filed (as of 2026-06-19) |
| Add Widgets panel (AC-23) | No "Inactive" badge, opacity only | [#657](https://github.com/SCITAIGROUP1/ChronoMint/issues/657) — Open |
| Arrange Grid toolbar (AC-26) | No standalone "Done" / "Done and Save as Default" buttons | [#733](https://github.com/SCITAIGROUP1/ChronoMint/issues/733) — Open |

**Confirmed working as specified, no gap:** Project Distribution donut/legend (AC-16, cosmetic dot-vs-bar only); Add Widgets core open/filter/toggle/persist/reset flow (AC-23–25); Arrange Grid drag/resize/save/save-as-default/reset/cancel mechanics (AC-26–27).

## Out of scope (do not test as defects)

Per the source doc: workspace-wide revenue/billing widgets, admin export wizard, peer hour rankings (Admin-app-only); Budget burn-down widget (Admin-only roadmap item); personal goals streaks/history (not yet shipped — Daily Progress widget covers single-day target only). No scenarios below target these.

---

## 1. Access & role scope (AC-1, AC-2, AC-3)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-001 | Member can access the Dashboard | TD-1, authenticated as Member | 1. Navigate to `/dashboard` | **Live-grounded.** Page loads with heading "Dashboard" and subtitle "Analyze your weekly progress and customize your widget layout."; no redirect/role-upgrade occurs | P0 | AC-1 |
| DM-002 | Dashboard is the default landing page after login | TD-1, signed out | 1. Go to `/login` 2. Sign in with valid Member credentials | User lands on `/dashboard` with no intermediate multi-context picker (single-workspace account) | P0 | AC-2 |
| DM-003 | Member does not see admin-only aggregates or peer data | TD-1 | 1. Load `/dashboard` 2. Inspect all personal widgets (KPI cards, Weekly Progress, Project Distribution, Category Split) | All personal widgets show only the signed-in user's own logged time; no workspace-wide revenue totals, peer hour rankings, or billing configuration appear anywhere on the page | P0 | AC-3 |
| DM-004 | Team Activities is the one workspace-wide exception, and stays privacy-safe | TD-1 | 1. Load `/dashboard` 2. Inspect the Team Activities table for all listed members | Table shows activity/duration/time-since per teammate (workspace-wide, by design) but **never** shows billing amounts, rates, or revenue for any member — confirmed live: only Member/Latest activity/Duration/Time since/period total/daily-hours-bar columns exist | P1 | AC-3 |

---

## 2. Page header & controls (AC-4, AC-5)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-005 | Header actions are all present | TD-1 | 1. Load `/dashboard` 2. Inspect header | **Live-grounded.** Title/subtitle, "Add Widgets" button, "Arrange Grid" button, Help-menu button, Notifications bell, Appearance toggle, Settings link, avatar "PS" linking to `/profile` — all present | P1 | AC-4 |
| DM-006 | Notifications badge reflects unread count | TD-1, account has ≥1 unread notification | 1. Load `/dashboard` 2. Compare header bell badge to sidebar nav's "Notifications" badge | **Live-grounded.** Header bell showed "3 unread" / "3", exactly matching the sidebar nav's own "Notifications 3" badge | P2 | AC-5 |

---

## 3. Period & Range filters (AC-6, AC-7, AC-8, AC-9)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-007 | Default period is "This week" | TD-1, fresh session | 1. Load `/dashboard` | **Live-grounded.** "This week" is active/highlighted by default; "Today" and "This month" are the other options; Range field shows the current week's span (e.g. "Jul 6 – Jul 12, 2026") | P0 | AC-6 |
| DM-008 | Switching to "Today" updates Range and period-aware widgets | TD-1 | 1. From default "This week", click **"Today"** | Range field updates to today's single date; KPI cards, Weekly Progress Chart, Project Distribution, Category Split, Team Activities all re-fetch and reflect the new range | P0 | AC-7 |
| DM-009 | Switching to "This month" relabels the Week KPI card | TD-1 | 1. Click **"This month"** 2. Inspect the "Total Hours (Week)" card | **Live-grounded.** Card heading changes to **"Total Hours (Period)"**; Range shows "Jul 1 – Jul 10, 2026"; additionally observed (not in AC text) that the Weekly Progress Chart's own heading drops "Weekly" to become "Progress Chart", and Team Activities' "This week" column header relabels to "This month" | P1 | AC-7 |
| DM-010 | Custom date range deselects period presets | TD-1 | 1. Open "Dashboard date range" control 2. Select a custom start/end date that doesn't match a preset span | No Period preset button remains highlighted; widgets refresh for the custom range | P1 | AC-8 |
| DM-011 | Empty period shows zero, not an error | TD-2 (period/range with no logged time) | 1. Select a period/range with zero logged time for this user | KPI cards show `0h` / `0` (not blank/error); Project Distribution and Category Split show **"No time logged in this period"** instead of a broken/empty chart | P0 | AC-9 |

---

## 4. Scope filters (AC-10, AC-11, AC-12, AC-13)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-012 | Scope filters collapsed by default with helper text | TD-1 | 1. Load `/dashboard` | **Live-grounded.** "Scope filters" toggle visible, collapsed, helper text "Optional — narrow dashboard widgets" | P2 | AC-10 |
| DM-013 | Scope filters expose only Project, Category, Task — no Member filter | TD-1 | 1. Expand "Scope filters" 2. Inspect all controls shown | **Live-grounded.** Exactly three controls: Project ("All projects"), Category ("All categories"), Task (static "Select a project first", no combobox yet). No Member/user filter exists anywhere in this panel, consistent with Member data-visibility rules | P1 | AC-11 |
| DM-014 | Selecting a project enables the Task filter | TD-1 | 1. Expand "Scope filters" 2. Select a project from the Project dropdown | Task control becomes an enabled combobox, scoped to tasks under the selected project | P1 | AC-12 |
| DM-015 | Clearing scope filters resets all three to defaults | TD-1, one or more scope filters set (post DM-014) | 1. With filters set, click the clear/reset scope-filters action | Project reverts to "All projects", Category to "All categories", Task reverts to disabled/empty; all widgets refresh to the unfiltered view | P2 | AC-13 |

---

## 5. Widget catalog

### 5a. KPI stat cards (AC-14)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-016 | KPI cards render correct values and sub-lines | TD-1 | 1. Load `/dashboard` 2. Inspect Total Hours (Today), Total Hours (Week), Active Projects | **Live-grounded.** "Total Hours (Today)" = 0h / "0h billable"; "Total Hours (Week)" = 14.66 / "12 billable"; "Active Projects" = 1 / "Assigned projects" | P0 | AC-14 |
| DM-017 | KPI cards vs. ticket #563's literal 4-stat/HH:MM:SS/workspace-wide spec | TD-1 | 1. Compare rendered KPI cards + hours formatting against ticket #563's literal wording | **Expected to fail against literal AC/ticket wording — known gap, already filed as [#720](https://github.com/SCITAIGROUP1/ChronoMint/issues/720) (open) and [#721](https://github.com/SCITAIGROUP1/ChronoMint/issues/721) (marked Completed, re-verified still failing 2026-07-01).** Confirmed live this session: stats render as grid widgets (not a fixed top bar); Billable Hours is off by default; "Active Projects" shows only the member's own assigned/active count (1), not a separate workspace-wide count; all values shown as decimals ("14.66"), never `HH:MM:SS` — do not re-file | P3 | AC-14 |

### 5b. Weekly Progress Chart (AC-15)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-018 | Chart renders day bars split billable/nonBillable | TD-1 | 1. Load `/dashboard`, period = This week | **Live-grounded.** Bar chart with Mon–Sun labels, Y-axis "Hours" auto-scaled (0/4/8/12/16 observed), "8h Goal" line, legend "billable"/"nonBillable"; reflects only the signed-in user's own time | P1 | AC-15 |
| DM-019 | Chart X-axis and range behavior for longer periods | TD-1 | 1. Switch period to "This month" 2. Inspect X-axis labels | **Live-grounded.** X-axis switches to day+month labels (e.g. "Jul 1", "Jul 2" ... "Jul 10") — confirms no combined "Tue, Jul 2" format is ever used, and chart is not locked to a 7-day week | P2 | AC-15 |
| DM-020 | Chart vs. ticket #564's literal per-project/tooltip/nav-arrow spec | TD-1 | 1. Compare chart against ticket #564's literal wording (per-project color segments, total+per-project tooltip, prev/next arrows) | **Expected to fail against literal AC/ticket wording — known gap, not yet filed as of the source doc's last QA pass (2026-06-18).** Confirmed: bars split only Billable/Non-billable (no per-project color segmentation); zero-time days render as zero-height bars with no "00:00:00" label; tooltip shows only that day's Billable/Non-billable (no total, no per-project breakdown); no prev/next arrow buttons on the chart itself — navigation is dashboard-level Period/Range only. Do not re-file as new; flag only if this becomes formally tracked | P3 | AC-15 |

### 5c. Project Distribution (AC-16)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-021 | Donut renders with center total and legend | TD-1 (time logged across ≥1 project) | 1. Load `/dashboard` | **Live-grounded.** Donut with "14.66h" / "Total Logged" centered; legend table (Project/Hours/%) shows "Aimswebplus" / "Pearson" (client) / 14.66h / 100% | P1 | AC-16 |
| DM-022 | Single-project period renders full circle | TD-1 (exactly one project logged in period — matches this account's current state) | 1. Load `/dashboard` with only one project logged | Donut renders as a full circle (single slice) — confirmed live via the 100%/single-row legend | P2 | AC-16 |
| DM-023 | Empty period shows "No time logged" message | TD-2 | 1. Select a period/range with zero logged time | Widget shows **"No time logged in this period"** — no chart, no error | P1 | AC-16 |
| DM-024 | Legend color indicator is a dot, not a bar (cosmetic, no gap) | TD-1 | 1. Inspect the legend's color indicator next to "Aimswebplus" | **Confirmed working as specified, cosmetic-only difference from ticket #566 (already noted, RQA #566 2026-06-17):** color indicator is a small circular dot (`ProjectColorDot`), not a rectangular bar — functionally equivalent, not a defect, do not re-file | P4 | AC-16 |

### 5d. Category Split (AC-17)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-025 | Category donut shows logged hours by category | TD-1 | 1. Load `/dashboard` | **Live-grounded.** Donut center shows "14.66h" / "This week" (relabels with period), category label "QA" shown | P2 | AC-17 |
| DM-026 | Empty period shows "No time logged" message | TD-2 | 1. Select a period/range with zero logged time | Widget shows **"No time logged in this period"** | P2 | AC-17 |

### 5e. Quick Timer (AC-18)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-027 | Project/Task selectors and Start-tracking gating | TD-1, no timer currently running | 1. Load `/dashboard` 2. Inspect Quick Timer widget before selecting anything | **Live-grounded.** Project combobox defaults to "Select"; Task combobox disabled with placeholder "No tasks"; "Start tracking" button disabled | P0 | AC-18 |
| DM-028 | Selecting a project enables Task, but Start stays gated until Task is chosen | TD-1 | 1. Select "Aimswebplus" from the Project combobox 2. Inspect Task combobox and Start button | **Live-grounded.** Task combobox becomes an enabled "Select" combobox; "Start tracking" remains disabled until a Task is also selected — confirmed live this session | P1 | AC-18 |
| DM-029 | Starting a timer reflects the running-timer sequence | TD-1, valid project+task selected, no timer active elsewhere | 1. Select project+task 2. Click "Start tracking" | Per `TIMER_SEQUENCE.md`: `POST /timer/start` fires, elapsed time counts from `00:00:00`, selectors are replaced by an in-progress view with **Stop** (and, per the documented gap, an extra **Pause/Resume** control) plus an inline **Note** field. **Needs setup** — starting a real timer alters live account state; run against a disposable/test time window | P1 | AC-18 |
| DM-030 | Second active timer shows a conflict, not a silent overwrite | TD-3 (a timer already running, e.g. started from `/timer`) | 1. With a timer already active for this user, attempt to start another from the dashboard Quick Timer widget | `409 TIMER_ALREADY_ACTIVE` is returned; widget surfaces an error toast ("A timer is already running. Stop it first."). **Expected to fail against literal ticket wording — known gap, already filed as [#655](https://github.com/SCITAIGROUP1/ChronoMint/issues/655) (open):** the ticket specifies a confirmation-dialog prompt ("You have an active timer. Stop the current one and start new?"); the live implementation shows a toast instead — do not re-file | P1 | AC-18 |
| DM-031 | Stop behavior uses the inline Note, not a post-Stop dialog | TD-1, timer running (post DM-029) | 1. Type text into the inline Note field while the timer is running 2. Click Stop | Timer stops immediately using the current Note text as the description; entry is saved and appears in Time Entry list/Timesheet/Calendar without a page refresh. **Expected to fail against literal ticket wording — known gap, already filed as [#656](https://github.com/SCITAIGROUP1/ChronoMint/issues/656) (open):** ticket expects the description to be requested via a dialog *after* Stop is clicked; the live implementation captures it inline *before* Stop — do not re-file | P1 | AC-18 |
| DM-032 | Stop/Pause control labels and ring vs. ticket wording | TD-1, timer running | 1. Inspect the in-progress timer view's controls | **Expected to fail against literal ticket wording — known gap, already filed as [#654](https://github.com/SCITAIGROUP1/ChronoMint/issues/654) (open):** stop control is labeled "Stop" (not "Stop Timer"); no animated clock ring (plain monospace elapsed time); an extra Pause/Resume control exists that the ticket never mentions — do not re-file | P2 | AC-18 |
| DM-033 | 8-hour idle alert does not fire from the dashboard widget | TD-4 (timer idle 8+ hours) | 1. Leave a timer running/idle for 8+ hours 2. Observe the dashboard Quick Timer widget (not `/timer`) | **Expected to fail against literal AC wording — known gap, not yet filed as of the source doc's last QA pass (2026-06-19).** The `StaleTimerDialog` 8-hour alert only fires on `/timer`, never from this widget, even though timer state is shared — a Member relying solely on the dashboard never sees the warning. **Needs setup** — not exercised live this session (would require an 8-hour idle window); do not re-file as new, flag only if formally tracked | P2 | AC-18 |

### 5f. Daily Progress (AC-19)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-034 | Radial progress ring shows percentage, logged/target, remaining message | TD-1 | 1. Load `/dashboard` | **Live-grounded.** Ring shows "0%" / "of target"; "0.00 / 8 hrs"; "Need 8.00 more hours today." (target reflects the member's configured 8-hr daily target) | P2 | AC-19 |

### 5g. Today's Activity Feed (AC-20)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-035 | Timeline shows today's time entries | TD-1, time logged today | 1. Log time today 2. Load `/dashboard` | Interactive timeline of today's time entries is shown. **Needs setup** — this account had 0h logged today this session, so only the empty state (DM-036) was live-confirmed; positive case needs a fresh time entry logged today | P2 | AC-20 |
| DM-036 | Empty state when nothing logged today | TD-1, 0h logged today | 1. Load `/dashboard` with no time logged today | **Live-grounded.** Shows "No time tracked yet today. Hit start and get going." with an icon — not an error state | P2 | AC-20 |

### 5h. Team Activities (AC-21)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-037 | Table renders all workspace members with required columns | TD-1 | 1. Load `/dashboard` | **Live-grounded.** Table lists all workspace members (11 rows observed) with Member/Latest activity/Duration/Time since/period-total/Hours-by-day columns; caption "Respects your dashboard period. Bar height shows daily hours — hover for exact values. Today is highlighted." | P1 | AC-21 |
| DM-038 | Members with no activity show correct zero-state | TD-1 | 1. Inspect rows for members with no logged time in the period | **Live-grounded.** Shows "No activity", "—"/"—" for duration/time-since, "0h" for period total, zeroed bar chart with "No hours logged in selected period" label | P2 | AC-21 |
| DM-039 | Table stays privacy-safe despite being workspace-wide | TD-1 | 1. Inspect every column across all rows | No billing amounts, rates, or revenue shown for any member — activity/duration only, consistent with AC-3's stated exception | P0 | AC-21 |
| DM-040 | Weekly distribution bar vs. ticket #565's literal per-project/stacked/horizontal spec | TD-1 | 1. Compare "Hours by day" bar against ticket #565's body (copied from Admin's Team Activities story) | **Expected to fail against literal ticket wording — known gap, already filed as [#618](https://github.com/SCITAIGROUP1/ChronoMint/issues/618) (open):** the ticket specifies a stacked, horizontal, per-project color-coded bar; the live "Hours by day" mini chart is a vertical, single-color, per-day (not per-project) sparkline. Also note (same doc, no separate issue number): avatars are initials-based, not real photos; empty days render transparent rather than a visible grey bar; "This week" total is decimal ("14.66h"), not `HH:MM:SS` (same underlying gap as #721) — do not re-file | P3 | AC-21 |
| DM-041 | Ticket #565's title/body mismatch does not indicate a missing feature | TD-1 | 1. Confirm the separate "Today's Activity Feed" widget (matching ticket #565's own title) also exists and works | Both widgets exist and function correctly (Team Activities = AC-21, Today's Activity Feed = AC-20); the mismatch is specifically that ticket #565's *body* text describes Team Activities while its *title* describes a different, also-existing widget — not a missing feature, just doc/ticket cross-referencing confusion. No action needed, informational only | P4 | AC-21 |

### 5i. Hidden-by-default widgets (AC-22)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-042 | Hidden widgets do not render until enabled | TD-1, default layout | 1. Load `/dashboard` with default widget config | Billable Hours, Pinned Favorites, Recent Activity, My Timesheets do not appear on the grid | P1 | AC-22 |
| DM-043 | "My Timesheets" shows only the member's own submissions when enabled | TD-9 | 1. Enable "My Timesheets" via Add Widgets 2. Inspect its content | Shows a summary of the Member's own timesheet submission periods and approval statuses only — not workspace-wide approvals. **Needs setup** — depends on account's existing timesheet submission history | P2 | AC-22 |

---

## 6. Layout customization

### 6a. Add Widgets / Customize Dashboard panel (AC-23)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-044 | Panel opens as a right-side overlay without navigating away | TD-1 | 1. Click **"Add Widgets"** | **Live-grounded.** "Customize Dashboard" panel slides in from the right as an overlay; dashboard remains visible underneath; button toggles to **"Close Catalog"** | P0 | AC-23 |
| DM-045 | Panel lists all 14 widgets with full metadata | TD-1, panel open | 1. Inspect the widget list | **Live-grounded.** "Available Widgets (14)"; each row has icon, name, "Active" badge (10 of 14 have it, matching the default-visible set), description, "Min: NxM \| Default: NxM", and a switch; list scrolls independently | P1 | AC-23 |
| DM-046 | Filter-category pills narrow the widget list | TD-1, panel open | 1. Click each of KPI / Time / Composition / Quick in turn | **Live-grounded (labels only).** Filtering works and shows only widgets in that group. **Expected to fail against literal ticket wording — known gap, cosmetic-only, no issue filed (matches working functionality):** the ticket calls these "filter tabs"; the live implementation renders rounded pill/chip buttons labeled "Filter Categories" — cosmetic only, behavior matches | P2 | AC-23 |
| DM-047 | Filtering to a category with zero matches shows no empty-state message | TD-1, panel open | 1. Select a filter category with 0 matching widgets | **Expected to fail against literal ticket wording — known gap, not yet filed as of the source doc's last QA pass (2026-06-19):** shows "Available Widgets (0)" but no "No widgets available." message — just an empty list area. **Needs setup** — requires identifying/confirming a category with 0 widgets in the current registry before this can be walked live | P3 | AC-23 |
| DM-048 | Hidden widgets show no "Inactive" badge | TD-1, panel open | 1. Inspect a hidden widget row (e.g. "Billable Hours", "Pinned Favorites") | **Live-grounded — expected to fail against literal ticket wording — known gap, already filed as [#657](https://github.com/SCITAIGROUP1/ChronoMint/issues/657) (open):** confirmed live this session — hidden widgets show reduced opacity and an unchecked switch, but no explicit "Inactive" text/badge; only enabled widgets get the "Active" badge — do not re-file | P3 | AC-23 |

### 6b. Toggling widgets on/off (AC-24)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-049 | Enabling a hidden widget adds it to the grid immediately | TD-1, panel open | 1. Switch "Billable Hours" on | Widget becomes visible on the grid immediately, no full page reload | P1 | AC-24 |
| DM-050 | Disabling a visible widget removes it but keeps it listed | TD-1, panel open, a widget currently visible | 1. Switch a visible widget (e.g. "Category Split") off | Widget is removed from the grid immediately; remains listed (toggle off) in the Customize panel for later re-activation | P1 | AC-24 |
| DM-051 | Each toggle auto-persists immediately, not batched | TD-1, panel open | 1. Toggle a widget 2. Reload the page without clicking "Done Editing" | Toggle state survives the reload — confirming persistence happens per-click, not on panel close | P1 | AC-24 |
| DM-052 | Newly-enabled widget position is not guaranteed at the bottom | TD-1, panel open | 1. Enable a hidden widget 2. Observe where it lands in the grid | **Not a defect — documented clarification, not a gap:** per the source doc's note, the grid uses vertical auto-compaction (`compactType="vertical"`), so landing position depends on available space and may not be at the very bottom, despite older ticket wording implying otherwise | P4 | AC-24 |

### 6c. Reset Layout & Done Editing (AC-25)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-053 | "Reset Layout" reverts to the default widget set | TD-6 (layout previously customized) | 1. With a customized layout, click **"Reset Layout"** in the Customize panel | Layout reverts to `DEFAULT_LAYOUT`: Total Hours Today/Week, Active Projects, Weekly Progress, Project Distribution, Category Split, Quick Timer, Daily Progress, Today's Activity Feed, Team Activities visible; Billable Hours, Pinned Favorites, Recent Activity, My Timesheets hidden | P1 | AC-25 |
| DM-054 | "Done Editing" only dismisses the panel, no separate save | TD-1, panel open | 1. Toggle a widget 2. Click **"Done Editing"** | Panel closes, grid returns to normal (non-edit) state; no additional save action occurs beyond the already-auto-persisted toggle (per AC-24) | P2 | AC-25 |

### 6d. Arrange Grid mode (AC-26)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-055 | Arrange Grid activates edit mode with a sticky toolbar | TD-1 | 1. Click **"Arrange Grid"** | **Live-grounded.** Button toggles to "Done Arranging"; grid becomes drag/resize-enabled; sticky "Rearranging Layout" / "Edit Mode" banner appears with guidance text "Drag anywhere on a widget to move; drag edges or the corner to resize." and stays pinned while scrolling | P1 | AC-26 |
| DM-056 | Cancel discards in-progress changes | TD-1, arrange mode active, a widget moved/resized | 1. Move/resize a widget 2. Click **Cancel** | Dashboard reverts to the layout it had before Arrange Grid mode was entered (in-memory snapshot, no server round-trip) | P1 | AC-26 |
| DM-057 | "Save layout" persists per-member only | TD-1, arrange mode active, layout changed | 1. Click the **Save options** chevron 2. Click **"Save layout"** | Change is persisted for this Member only (per-user, per-workspace); survives logout/login. **Needs setup** — full logout/login re-verification not performed this session to avoid disturbing the shared QA account's live layout | P1 | AC-26 |
| DM-058 | "Save as default" also updates the workspace default | TD-1, TD-7, arrange mode active, layout changed | 1. Click **Save options** → **"Save as default"** | Current arrangement is saved as the workspace's default layout — the one "Reset Layout" restores to and what new/other members without a personal layout would see. **Needs setup** — verifying "other members see this" needs TD-7 (a second account), unavailable this session | P2 | AC-26 |
| DM-059 | Reset Layout (in Arrange mode) reverts to the workspace default, not necessarily `DEFAULT_LAYOUT` | TD-1, arrange mode active | 1. With a workspace default previously overridden via "Save as default" 2. Click **Reset Layout** | Dashboard reverts to the current workspace default layout (which is `DEFAULT_LAYOUT` unless someone overrode it via "Save as default") | P2 | AC-26 |
| DM-060 | Toolbar buttons vs. ticket's literal 4-button spec | TD-1, arrange mode active | 1. Inspect the toolbar's buttons | **Live-grounded — expected to fail against literal ticket wording — known gap, already filed as [#733](https://github.com/SCITAIGROUP1/ChronoMint/issues/733) (open):** confirmed live this session — toolbar shows Cancel, Reset Layout, and a combined Save button + "Save options" dropdown (menu items "Save layout" / "Save as default"); there is no standalone "Done" button and no independently-visible "Save as Default" without opening the dropdown, contradicting the ticket's literal 4-distinct-button spec. All underlying functionality (drag, resize, per-user save, save-as-default, reset, cancel) works correctly — do not re-file | P3 | AC-26 |

### 6e. Layout persistence per workspace (AC-27)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-061 | Personal layout persists across reload/new session | TD-1, personal layout customized (post DM-057) | 1. Customize layout, save 2. Reload the page or start a new session | Same customized personal layout is restored for workspace "Integritas" | P1 | AC-27 |
| DM-062 | Switching workspace does not carry over the custom layout | TD-5 | 1. Customize layout in workspace A 2. Switch to workspace B | Workspace B shows its own (different) layout — layout persistence is workspace-scoped. **Needs setup** — `peter123` belongs to only one workspace ("Integritas"); not live-walkable this session | P2 | AC-27 |
| DM-063 | Personal layout vs. workspace default remain independently tracked | TD-1, TD-7 | 1. Member A saves a personal layout 2. A different admin/member changes the workspace default | Member A's personal layout is unaffected by the workspace-default change; only Member A's own explicit "Reset Layout" action would overwrite it. **Needs setup** — requires a second account/session, unavailable this session | P2 | AC-27 |

---

## 7. Cross-cutting / non-functional (AC-28, AC-29, AC-30)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| DM-064 | Loading state shown during fetch/period change | TD-1 | 1. Load `/dashboard` (hard refresh) and separately switch Period 2. Observe widgets during the fetch window | Widgets show a loading state (skeleton/spinner) rather than stale or blank content; no flash of a zero value that could be mistaken for real data | P1 | AC-28 |
| DM-065 | Stale `X-Workspace-Id` after switching workspace elsewhere returns 403 | TD-8 | 1. Switch active workspace on another device/tab 2. Perform a dashboard data request on this tab with the now-stale workspace header | Request returns `403`, per documented `AUTH.md`/`MULTI_DEVICE_SESSIONS.md` behavior. **Needs setup** — single-workspace account this session; this is an auth-layer behavior applicable to, but not unique to, the dashboard route | P2 | AC-29 |
| DM-066 | No unexpected console/API errors on normal load | TD-1 | 1. Load `/dashboard` with dev tools console open 2. Inspect console and network tab for the full widget-loading sequence | No unhandled API errors (e.g. no unexpected 403/404) from any widget data call. **Live-grounded partial check:** console showed 0 errors / 1 warning during this session's exploration — flag any such error found during full exploratory/automation runs as a defect candidate, not an assumed non-issue | P1 | AC-30 |

---

## Coverage summary

All 30 ACs (AC-1–AC-30) from `docs/qa/user_stories/Dashboard_Member.md` are covered by at least one scenario above (66 scenarios total: DM-001–DM-066). Scenarios tied to a documented, dated gap in the source doc are explicitly marked "known gap, already filed as #NNN" (or "not yet filed") and are **not** to be re-logged as new defects in Step 6 of this playbook — only genuinely new discrepancies found during Step 3 exploratory testing should be filed.
