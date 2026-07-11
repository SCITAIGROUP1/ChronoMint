# Test Plan — Member Timer (`/timer`)

**Module:** `timer-member`
**Target application:** Client / Member app — https://chrono-mint-client.vercel.app/
**Test account:** `peter123@yopmail.com` / `Password1@` (Member role, workspace **"Integritas"**)
**Source of truth:** `docs/qa/user_stories/Timer_Member.md` (33 ACs — AC-1 through AC-33 — across 7 numbered sections: Access & prerequisites; Starting a timer; While tracking; Keyboard shortcuts; Stale timer/auto-stop; Sidebar widgets; Cross-cutting/non-functional)

This is a **brand-new QA pass** for the standalone `/timer` page — distinct from the Dashboard's "Quick Timer" widget, already covered by `specs_qa/dashboard-member.md` (DM-027–DM-033) and automated in `Test/dashboard-member/tests/quick-timer.spec.ts`. See "Relationship to the Dashboard Quick Timer QA pass" below for exactly what is and isn't duplicated.

## Live-verification note carried over from the source doc, and a discrepancy found this session

The source doc's own header states: *"At the time of testing this account had no projects assigned in its only workspace ('Integritas'), so the 'no projects assigned' empty state (AC-4) was confirmed live... pending a project-assigned account to re-confirm visually end-to-end."*

**This session found the opposite live state**: `peter123@yopmail.com` / "Integritas" now has exactly one assigned project ("Aimswebplus", with tasks grouped BA/Development/QA). This let this pass fully ground AC-5 through AC-16's active-timer flow live (which the source doc could only verify from code), but it means **AC-4's "no projects assigned" empty state is no longer reproducible on this account** — the account's assignment state has changed since the source doc was last verified. This is flagged per this playbook's guardrail ("if the doc references code as ground truth and something looks stale, say so") rather than silently re-asserting the doc's older claim. TM-005 below is marked accordingly.

## Screens/controls confirmed via live exploration (Playwright MCP, session dated in this run)

| Area | Confirmed live |
|---|---|
| Header (idle) | Heading "Timer", subtitle "Choose a project and task before you start tracking." |
| Header (tracking) | Subtitle "Manage your ongoing timer. Pausing allows taking breaks without breaking logs." |
| Start Timer card (idle) | Heading "Start Timer"; ring frozen at `00:00:00`; hint "Tip: Press Space or Ctrl+Shift+T to start"; Project combobox ("Select project" placeholder, searchable popup with a "Suggestions" listbox); Task combobox disabled ("Select a project first") until a project is chosen, then becomes "Select a task" and groups options under category headers (confirmed: **BA** → Spec Implementation; **Development** → Code Implementation; **QA** → Meeting, Testing); "Start timer" button disabled until both are chosen |
| Tracking Time card | Heading "Tracking Time"; subtitle `Integritas · Aimswebplus · Testing` (color dot + project — task); animated ring (blue arc filling clockwise) with `HH:MM:SS` centered and a "Recording" label; hint "Press Space to stop • Shift+Space to pause/resume break"; Note (optional) textbox (placeholder "What did you work on?"); **Pause break** / **Stop & save** buttons |
| Paused state | Ring/label switch to "Paused Break"; buttons become **Resume** / **Stop & save**; banner "⏸ Timer is paused. Resume when you're back, or stop to save." appears above the buttons |
| Toasts confirmed live | "Timer started successfully!" (on start); resume/stop toasts fire but were not screenshotted mid-flight (toasts auto-dismiss quickly) — accepted as code-verified per `timer-page.tsx`/`timer-autostop-message.ts` |
| Tab title | Confirmed live: `⏱️ HH:MM:SS — Kloqra` while recording, `⏸️ HH:MM:SS — Kloqra` while paused, plain `Kloqra` when idle/stopped |
| Daily Progress (sidebar) | Heading "Daily Progress" + pencil "Edit daily goal" button → inline spinbutton (`8` hrs) with Save/Cancel; radial gauge (e.g. "56% / of target"); "4.49 / 8 hrs"; "Need 3.51 more hours today."; a streak pill ("1 Day Streak!"); 7-day Mon–Sun grid, each day a tooltip like `"Jul 9: 14.7 / 8h (Goal Met)"` with a ✓ mark, `"Jul 10: 3.2 / 8h (In Progress)"` with a ~ mark, weekend days labeled `(Weekend)`; "Milestones (Last 14 Days)" with 4 badges — Early Bird, Super Logger, Streak Champ, Perfect Week — each with its own tooltip text (e.g. "Log 10 or more hours in a single day"); Super Logger showed as achieved/highlighted this session, the other 3 as not-yet-achieved |
| Yesterday summary strip | Confirmed live: "Yesterday" / "14h 39m logged" / "82% billable" / "Top: Testing" |
| Pinned Favorites | Heading "Pinned Favorites (Max 3)"; empty-state text "No pinned tasks yet. Select a project and task above, then click the pin button."; a "Pin current task" icon-button appears next to the heading only once both Project and Task are selected; clicking it toggles to "Unpin current task" and adds a chip (e.g. "Aimswebplus / Testing") replacing the empty-state text |
| Recent Activity | Heading "Recent Activity"; showed 2 chips this session ("Aimswebplus / Testing", "Aimswebplus / Meeting"); clicking a chip re-populates the Project/Task selectors and enables "Start timer" |
| Network/headers | `GET /timer/active` fires after every start/pause/resume/stop action (confirmed via Playwright network log) in addition to periodic background polling; request headers confirmed `x-auth-scope: client` and `x-workspace-id: <Integritas's id>` on every timer call |
| Jira issue picker | **Not visible this session** — account/workspace has no connected Jira integration, so AC-13's "In Progress issue" one-click buttons could not be grounded live |

## Test data / setup prerequisites

| ID | Data/state needed | Used by | Available this session? |
|---|---|---|---|
| TD-1 | Standard Member account, workspace "Integritas", ≥1 assigned project with ≥1 task | Most scenarios below | Yes (`peter123@yopmail.com`, project "Aimswebplus") |
| TD-2 | A Member account/workspace with **zero** assigned projects (to re-confirm AC-4's empty state) | TM-005 | No — this session's account now has a project (see discrepancy note above); the source doc's own historical confirmation is the only evidence for this AC |
| TD-3 | A project with zero tasks assigned to this member (to trigger AC-6's "No tasks for this project" hint) | TM-008 | No — this account's only project ("Aimswebplus") has tasks |
| TD-4 | A second device/tab/session to start a conflicting timer (same workspace or a different one) | TM-004, TM-012, TM-013, TM-060 | Partial — a second browser tab against the same account is technically reachable, but true concurrent-session conflict testing wasn't exercised this run to avoid corrupting the single live timer state mid-plan |
| TD-5 | An impersonation ("view as member") session from an Admin/Owner account | TM-014, TM-041 | No — no admin credentials available this session |
| TD-6 | A timer left running/idle 8+ hours (member's stale-warning threshold) | TM-036–TM-040 | No — would require leaving a real timer running for 8 hours; same known gap category as dashboard-member's TD-4 |
| TD-7 | A timer left running past `NEXT_PUBLIC_HARD_AUTO_STOP_HOURS` (server hard ceiling) | TM-042, TM-043 | No — requires an even longer unattended window than TD-6 plus knowledge of the configured env var value |
| TD-8 | An account/workspace with a connected Jira integration and ≥1 "In Progress" issue | TM-020 | No — this workspace has no Jira connection |
| TD-9 | A Member account belonging to 2+ workspaces (to test cross-workspace conflict, AC-9/AC-31) | TM-013, TM-060 | No — `peter123` belongs only to "Integritas" (same gap as dashboard-member's TD-5) |
| TD-10 | A day with zero logged time for this member, to see Yesterday-summary hidden and Recent-Activity empty states | TM-056, TM-058 | No — account has active recent history; would need a fresh/reset account |
| TD-11 | Ability to leave the Daily Progress target at a non-default value / cross the daily target live | TM-046 (boundary), TM-048 | Partial — inline edit UI reachable and cancelable; not saved/pushed to boundary values (0.5h / 24h) or crossed live, to avoid corrupting the shared QA account's real daily-target setting |

Scenarios needing unavailable test data are marked **"Needs setup"** below rather than skipped, per playbook convention.

## Relationship to the Dashboard Quick Timer QA pass (no duplicated scope)

`specs_qa/dashboard-member.md` (DM-027–DM-033) and `Test/dashboard-member/tests/quick-timer.spec.ts` already regression-test the Dashboard's **Quick Timer widget**: project/task selector gating, the start/pause/resume/stop request lifecycle, and the 409-conflict/no-idle-alert gaps specific to that widget (filed as #654/#655/#656, plus an unfiled 8-hour-idle gap). This plan does **not** re-litigate those widget-specific findings.

What this plan covers instead, all specific to the standalone `/timer` page and absent from the dashboard widget:
- **Keyboard shortcuts** (AC-17–AC-21: Space, Ctrl+Shift+T, Shift+Space, on-screen hints, live tab-title updates) — the Quick Timer widget has none of this.
- **Stale-timer dialog and hard auto-stop** (AC-22–AC-25) — per DM-033, the dashboard widget shares timer *state* but never shows the stale-timer warning; this is a `/timer`-only surface.
- **Sidebar widgets** (AC-26–AC-30: Daily Progress with 7-day grid + gamification milestones, Pinned Favorites, Recent Activity, Yesterday summary) — none of these render inside the Quick Timer widget; they are unique to this page's layout.
- **Jira issue picker** (part of AC-13) — not present on the dashboard widget at all.
- The animated clock ring, inline Note field, and "project — task" subtitle format (AC-11–AC-12) are richer than the dashboard widget's plain monospace timer + no-ring gap (#654), so they're re-verified here as page-specific UI, not copy-pasted from the dashboard findings.

The only conceptual overlap is the underlying start/pause/resume/stop/discard *mechanics* and project→task selection gating (AC-5–AC-9, AC-14–AC-16), which necessarily also exist on this page because it's the same backend contract (`timer.dto.ts`). Scenarios for these are still included below (every AC in this module's source doc needs its own scenario per the playbook's no-orphan rule), but are noted inline where the same mechanic was already regression-verified against the dashboard widget.

## Out of scope (per source doc — do not test as defects here)

- Manual time-log creation/edit/delete (Time Tracker module, `docs/specs/timelogs.md`).
- Team-wide active-timer visibility (`GET /timer/active-count`) — Admin-only.
- Timesheet submission/approval workflow (`docs/specs/submissions.md`).
- Jira connection/setup itself — only the "In Progress" issue picker consuming an already-connected account is in scope (and could not be grounded live this session per TD-8).

---

## 1. Access & prerequisites (AC-1, AC-2, AC-3, AC-4)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| TM-001 | Member can reach Timer via left-nav link | TD-1 | 1. Log in as Member 2. Click "Timer" in the left navigation | **Live-grounded.** Navigates to `/timer`; "Timer" link sits alongside Dashboard, Time Tracker, Timesheet, Submissions, Notifications, My projects — confirmed live in the sidebar | P0 | AC-1 |
| TM-002 | Header copy in the not-tracking state | TD-1, no timer active | 1. Load `/timer` with no timer running | **Live-grounded.** Heading "Timer"; subtitle "Choose a project and task before you start tracking." | P1 | AC-2 |
| TM-003 | Header copy switches once tracking starts | TD-1 | 1. Start a timer | **Live-grounded.** Subtitle changes to "Manage your ongoing timer. Pausing allows taking breaks without breaking logs." immediately on start, no reload | P1 | AC-2 |
| TM-004 | Starting a second timer while one is active is server-rejected | TD-1, TD-4, a timer already running for this user | 1. With a timer active (e.g. from another tab/device), attempt `POST /timer/start` again | Second start is rejected (409-class error), consistent with AC-9's conflict messaging; only one active timer ever exists in Redis for this user. **Needs setup** — true concurrent-session start not exercised this run to avoid corrupting the single live timer mid-session; conceptually the same server rule already exercised for the dashboard Quick Timer widget (DM-030) | P0 | AC-3 |
| TM-005 | "No projects assigned" empty state | TD-2 | 1. Log in as a Member with zero assigned projects in the active workspace 2. Load `/timer` | Start Timer card shows "No projects assigned" / "You are not on any projects yet. Ask your admin to add you to a project."; Project/Task selectors are not shown. **Needs setup / discrepancy flagged** — this account now has 1 assigned project ("Aimswebplus"), so this state is *not* reproducible on the current test account this session (contradicts the source doc's own earlier live-verification note — see discrepancy callout above); this AC is code-verified only for this run | P1 | AC-4 |

---

## 2. Starting a timer (AC-5, AC-6, AC-7, AC-8, AC-9, AC-10)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| TM-006 | Project selector is a searchable dropdown; Task stays disabled until a project is chosen | TD-1 | 1. Load `/timer` idle 2. Click the Project combobox | **Live-grounded.** Opens a searchable popup ("Suggestions" listbox) showing "Integritas · Aimswebplus"; Task combobox remains disabled with "Select a project first" until a project is picked | P0 | AC-5 |
| TM-007 | Task list is grouped by category and filtered to the selected project | TD-1, project selected | 1. Select "Aimswebplus" 2. Open the Task combobox | **Live-grounded.** Task combobox becomes enabled ("Select a task"); options render grouped under category headers — confirmed live: **BA** → Spec Implementation, **Development** → Code Implementation, **QA** → Meeting, Testing | P1 | AC-5 |
| TM-008 | "No tasks for this project" empty state | TD-3 (project with zero tasks) | 1. Select a project that has no tasks assigned to this member | Task field shows "No tasks for this project" with hint "Ask your admin to assign you to tasks on this project." **Needs setup** — this account's only project has tasks; not reproducible live this session | P2 | AC-6 |
| TM-009 | Start button stays disabled until both Project and Task are chosen | TD-1 | 1. Select only a Project 2. Observe Start button 3. Also select a Task | **Live-grounded.** Start button disabled after Project-only selection; becomes enabled only once a Task is also chosen | P0 | AC-7 |
| TM-010 | Start button shows a busy "Starting…" label mid-request | TD-1, project+task selected | 1. Click "Start timer" and observe the button label during the in-flight request | Label briefly reads "Starting…" and the button is disabled for the duration of the request. **Code-verified only** — the request round-trip was too fast to reliably capture the transient label in this session's snapshots | P3 | AC-7 |
| TM-011 | Successful start switches to tracking view with toast and refreshed recent logs | TD-1, project+task selected | 1. Click "Start timer" (or press Space — see TM-026) | **Live-grounded.** `POST /timer/start` fires with `taskId`; UI switches to the "Tracking Time" card; toast "Timer started successfully!" appears; subsequent `GET /timer/active` confirms the new state | P0 | AC-8 |
| TM-012 | Start fails with a generic message when a timer is already running in this workspace | TD-1, TD-4, timer already active in "Integritas" | 1. Attempt to start a second timer while one is active in the same workspace | Inline form error + toast: "A timer is already running. Stop it first." **Needs setup** — requires a genuine concurrent session; mechanic already regression-verified for the dashboard Quick Timer widget's equivalent conflict path (DM-030, filed gap #655 is widget-UI-specific and does not apply to this page's error surfacing, which needs independent re-check) | P1 | AC-9 |
| TM-013 | Start fails with the server's specific message when a timer is running in *another* workspace | TD-1, TD-9 | 1. With a timer active in a different workspace this member belongs to, attempt to start one in "Integritas" | The server's specific cross-workspace message is shown (not the generic one). **Needs setup** — `peter123` belongs to only one workspace this session, so this path is not reachable; a second workspace membership is required | P2 | AC-9 |
| TM-014 | Timer controls are disabled with a view-only message while impersonating | TD-5 | 1. As an Admin/Owner, impersonate this Member 2. Load `/timer` | Start/pause/resume/stop/discard controls are disabled; message "Timer controls are disabled in view-only mode." is shown instead of the action button(s). **Needs setup** — no impersonation-capable account available this session | P1 | AC-10 |

---

## 3. While tracking (AC-11, AC-12, AC-13, AC-14, AC-15, AC-16)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| TM-015 | Animated ring fills, elapsed ticks per second, "Recording" label while running | TD-1, timer running | 1. Start a timer 2. Observe the ring over several seconds | **Live-grounded.** Blue arc fills clockwise around the ring; centered `HH:MM:SS` incremented once per second across repeated snapshots; "Recording" label shown | P0 | AC-11 |
| TM-016 | Ring turns amber and label reads "Paused Break" when paused | TD-1, timer running | 1. Click "Pause break" (or Shift+Space) | **Live-grounded.** Ring/label switch to "Paused Break"; elapsed time freezes (confirmed: `01:15:10` stayed constant across the paused snapshot) | P0 | AC-11 |
| TM-017 | Subtitle shows project color dot + "project — task" | TD-1, timer running | 1. Start a timer for a known project/task | **Live-grounded.** Subtitle read `Integritas · Aimswebplus · Testing` with a leading color dot | P1 | AC-12 |
| TM-018 | Warning hint when the server's active timer's task is no longer in the member's local list | TD-1, an admin removes the member from the task mid-session | 1. While tracking, have an admin unassign the member from the active task 2. Reload/poll | Warning hint replaces the subtitle: "Active timer on the server, but this task is not in your list. Stop to clear, or refresh the page." **Needs setup** — requires a second (admin) session to mutate task assignment mid-timer; not reproducible solo this session | P3 | AC-12 |
| TM-019 | Note field accepts free text up to 2000 chars | TD-1, timer running | 1. Type into the "Note (optional)" field | **Live-grounded (typed text accepted; length ceiling not boundary-tested).** Confirmed the field accepts arbitrary text including a literal space character without side effects (also verifies AC-19's ignore-shortcuts-while-typing behavior). The 2000-char ceiling itself was not pushed to its limit this session — **needs a boundary test** | P2 | AC-13 |
| TM-020 | Jira issue picker offers one-click "In Progress" issue buttons that populate the Note | TD-8 | 1. As a member with a connected Jira account and "In Progress" issues, start a timer 2. Inspect the area above/near the Note field | One-click `KEY: Summary` buttons appear and populate the Note field when clicked. **Needs setup** — this workspace/account has no connected Jira integration; picker was not visible at all this session, consistent with the AC's own visibility condition | P2 | AC-13 |
| TM-021 | Pause stops elapsed accumulation, shows banner + toast | TD-1, timer running | 1. Click "Pause break" | **Live-grounded.** `POST /timer/pause` fires; button flips to green "Resume"; banner "⏸ Timer is paused. Resume when you're back, or stop to save." appears; elapsed time stops incrementing | P0 | AC-14 |
| TM-022 | Resume continues from the previously accumulated elapsed time | TD-1, timer paused | 1. Click "Resume" | **Live-grounded.** `POST /timer/resume` fires; ring returns to "Recording"; elapsed time resumes counting up from where it was paused (not from 0) | P0 | AC-14 |
| TM-023 | Pause/Resume/Stop mutual busy-disable during in-flight requests | TD-1, timer running | 1. Click Pause and immediately inspect Stop's disabled state 2. Repeat for Resume | Busy labels ("Pausing…"/"Resuming…") shown and the *other* control (Stop) is disabled for the duration; Pause/Resume are themselves disabled while Stop is in flight. **Code-verified only** — requests completed too quickly in this session's snapshots to reliably capture the transient disabled/busy states | P2 | AC-14 |
| TM-024 | Stop & save creates a TimeLog, resets the UI, and merges into caches without refetch | TD-1, timer running, optional note entered | 1. Type a note 2. Click "Stop & save" | **Live-grounded.** `POST /timer/stop` fires; ring resets to `00:00:00`; note field clears; toast shows total logged duration; UI reverts to the "Start Timer" idle card. Independently confirmed the resulting entry appears correctly in Time Tracker (`Testing · <note text>`, correct duration) without a manual page refresh being required to see it reflected in this run's Time Tracker check | P0 | AC-15 |
| TM-025 | Stop with a "no active timer" server error self-heals to idle | TD-1 | 1. Trigger a Stop request in a state where the server no longer has an active timer for this user (e.g. race with an auto-stop or another session's stop) | Client still clears its local active-timer state (reverts to not-tracking view) in addition to surfacing the error — does not get stuck showing a stale "Tracking Time" card. **Needs setup** — this race condition needs two concurrent sessions or a timed auto-stop collision to reproduce; not exercised live this session | P3 | AC-16 |

---

## 4. Keyboard shortcuts (AC-17, AC-18, AC-19, AC-20, AC-21)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| TM-026 | `Space` starts the timer when idle, project+task selected, focus outside inputs | TD-1, project+task selected, idle, focus on a non-input element | 1. Click a neutral heading (out of any textbox) 2. Press `Space` | **Live-grounded.** Timer started immediately; toast "Timer started successfully!" appeared; confirmed via tab title flipping to `⏱️ 00:00:0X — Kloqra` | P0 | AC-17 |
| TM-027 | `Space` stops the timer when tracking | TD-1, timer running, focus outside inputs | 1. Press `Space` while tracking | Timer stops via the normal Stop & save flow. **Live-grounded for the toggle mechanism (same handler exercised via TM-026's start and TM-028's Ctrl+Shift+T stop)** — the Space-specific stop path itself was not independently re-triggered this session (to avoid creating an extra throwaway time-log entry beyond the ones already produced); flagged as a quick confirm-only follow-up, not a gap | P0 | AC-17 |
| TM-028 | `Ctrl+Shift+T` (secondary shortcut) toggles Start/Stop | TD-1 | 1. While tracking (started via Space), press `Ctrl+Shift+T` | **Live-grounded.** Timer stopped; tab title reverted from `⏱️ 00:00:16 — Kloqra` to plain `Kloqra`, confirming the same toggle handler as AC-17 | P1 | AC-18 |
| TM-029 | `Shift+Space` toggles Pause/Resume while tracking | TD-1, timer running | 1. Press `Shift+Space` (expect pause) 2. Press `Shift+Space` again (expect resume) | **Live-grounded.** First press: tab title switched to `⏸️ HH:MM:SS`, label "Paused Break". Second press: reverted to `⏱️ HH:MM:SS`, label "Recording" | P0 | AC-19 |
| TM-030 | Shortcuts are ignored while focus is in the Note field (or any input) | TD-1, timer running | 1. Click into the Note field 2. Type text that includes a literal space character | **Live-grounded.** Typed "QA note with a space typed" character-by-character into the Note field; timer remained "Recording" throughout (tab title stayed on the recording emoji the whole time) — the embedded space keystrokes did not stop the timer | P0 | AC-19 |
| TM-031 | On-screen shortcut hint while tracking | TD-1, timer running | 1. Inspect the hint text under the ring while tracking | **Live-grounded.** "Press Space to stop • Shift+Space to pause/resume break" | P2 | AC-20 |
| TM-032 | On-screen shortcut hint while idle | TD-1, idle | 1. Inspect the hint text under the ring while idle | **Live-grounded.** "Tip: Press Space or Ctrl+Shift+T to start" | P2 | AC-20 |
| TM-033 | Tab title updates live while recording | TD-1, timer running | 1. Start a timer 2. Observe the browser tab title over several seconds | **Live-grounded.** Title read `⏱️ 00:00:02 — Kloqra`, incrementing each second, confirmed across multiple snapshots | P1 | AC-21 |
| TM-034 | Tab title switches to the pause emoji when paused | TD-1, timer paused | 1. Pause a running timer | **Live-grounded.** Title switched to `⏸️ 01:15:10 — Kloqra` | P1 | AC-21 |
| TM-035 | Tab title reverts to app name when stopped | TD-1, timer running | 1. Stop the timer | **Live-grounded (stop case).** Title reverted to plain `Kloqra`. The "page unmounts" variant (navigating away mid-timer, then checking title elsewhere) was not separately re-verified this session — low-risk, same cleanup-effect code path | P2 | AC-21 |

---

## 5. Stale timer / auto-stop (AC-22, AC-23, AC-24, AC-25)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| TM-036 | Stale-warning dialog appears at the member's effective threshold (default 8h) | TD-6 | 1. Leave a timer running (not paused) past the 8-hour threshold | "Timer still running" dialog appears showing elapsed hours and the threshold. **Needs setup** — requires an 8+ hour unattended window; same known-gap category the dashboard-member pass flagged as untestable live (its TD-4) | P0 | AC-22 |
| TM-037 | "Keep running" dismisses and snoozes for 1 hour | TD-6, dialog showing | 1. Click "Keep running — I'm still working" | Dialog dismisses; does not reappear for 1 hour even though the timer keeps running past threshold. **Needs setup** — depends on TM-036's precondition | P2 | AC-22 |
| TM-038 | "Stop & save logged time" from the dialog creates a time log | TD-6, dialog showing | 1. Click "Stop & save logged time" | Normal stop flow executes; a time log is created for the full elapsed duration. **Needs setup** | P2 | AC-22 |
| TM-039 | "Discard" clears the timer with no time log | TD-6, dialog showing | 1. Click "Discard — timer was left running by mistake" | `POST /timer/discard` fires; active timer clears; **no** TimeLog is created; toast "Timer discarded. No time was logged." **Needs setup** | P1 | AC-22 |
| TM-040 | Dialog re-appears after the 1-hour snooze expires if still running past threshold | TD-6 | 1. After snoozing (TM-037), wait 1+ hour with the timer still running past threshold | Dialog re-appears. **Needs setup** — requires an additional hour beyond TM-036's 8-hour window | P3 | AC-23 |
| TM-041 | Stale-warning dialog is disabled entirely while impersonating | TD-5, TD-6 | 1. As an admin impersonating this member, leave a timer running past threshold | Dialog never appears during the impersonated (view-only) session. **Needs setup** — no impersonation session available this run | P3 | AC-23 |
| TM-042 | Hard auto-stop force-stops and logs time server-side past the ceiling | TD-7 | 1. Leave a timer running past `NEXT_PUBLIC_HARD_AUTO_STOP_HOURS` | Server force-stops the timer and creates a time log automatically, independent of the member's own soft threshold. **Needs setup** — requires an even longer unattended window than TM-036, plus the configured env var value | P0 | AC-24 |
| TM-043 | Client detects `autostopped: true` on next poll and shows a warning toast | TD-7, timer was hard-auto-stopped server-side | 1. Revisit `/timer` (or let the next 30s poll land) after a hard auto-stop occurred | Client clears local active-timer state, shows toast "Your timer was automatically stopped after `N` hours. A time entry was saved on your behalf.", and refreshes time-log lists. **Needs setup** — depends on TM-042's precondition | P1 | AC-24 |
| TM-044 | Client polls `GET /timer/active` roughly every 30s in addition to mount/tick | TD-1 | 1. Load `/timer` and leave it open, watching the network log | **Live-grounded (mechanism, not precise interval).** Confirmed `GET /timer/active` fires on mount and immediately after every start/pause/resume/stop action; repeated background calls were observed across the session consistent with periodic polling. The exact 30-second cadence was not stopwatch-timed in this short session — treat the interval itself as code-verified per `timer-page.tsx`, only the polling *behavior* is live-confirmed | P2 | AC-25 |

---

## 6. Sidebar widgets (AC-26, AC-27, AC-28, AC-29, AC-30)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| TM-045 | Daily Progress gauge reflects logged + live elapsed time vs. target | TD-1 | 1. Load `/timer` with some time already logged today and a timer running | **Live-grounded.** Ring showed "56% / of target", "4.49 / 8 hrs" (and updated to "4.51/4.52" as the running timer accrued), "Need 3.51/3.49/3.48 more hours today." reducing in step with elapsed time | P0 | AC-26 |
| TM-046 | Inline daily-target edit (0.5–24h range, persists) | TD-1, TD-11 | 1. Click the "Edit daily goal" pencil 2. Inspect the inline editor | **Live-grounded (UI open/cancel only).** Spinbutton defaulting to "8" with Save/Cancel buttons appeared inline next to the heading; canceled without saving to avoid altering the shared QA account's real target. **Needs a follow-up boundary test** for the 0.5–24h range and persistence-to-profile behavior | P2 | AC-26 |
| TM-047 | "Need X more hours today" hint text | TD-1, under target | 1. Inspect the gauge sub-text while under target | **Live-grounded.** "Need 3.51 more hours today." shown, updating live as elapsed time increased | P2 | AC-26 |
| TM-048 | Goal-reached state marks target met at/above target | TD-1, ≥ target hours logged today | 1. Log/track enough time today to reach or exceed the daily target | Gauge marks the goal as reached (visual state change, e.g. 100%+ styling). **Needs setup** — this account was well under target (56%) all session; not reproducible without logging several more hours | P3 | AC-26 |
| TM-049 | 7-day Mon–Sun grid with tooltips, marks weekends and no-log days | TD-1 | 1. Inspect the Weekly Progress grid | **Live-grounded.** Tooltips confirmed: `"Jul 6: 0.0 / 8h (No logs)"`, `"Jul 9: 14.7 / 8h (Goal Met)"` (✓), `"Jul 10: 3.2 / 8h (In Progress)"` (~), `"Jul 11: 0.0 / 8h (Weekend)"` / `"Jul 12: ... (Weekend)"` | P1 | AC-27 |
| TM-050 | Milestone badges evaluated over the last 14 days | TD-1 | 1. Inspect the "Milestones (Last 14 Days)" section | **Live-grounded.** All 4 badges present (Early Bird / Super Logger / Streak Champ / Perfect Week) each with descriptive tooltip text; "Super Logger" rendered in its achieved/highlighted state this session (consistent with the 14.7h logged on Jul 9), the other 3 in their not-yet-achieved state | P2 | AC-27 |
| TM-051 | Pin/unpin the current project+task, max 3 | TD-1, project+task selected | 1. Click "Pin current task" 2. Click "Unpin current task" | **Live-grounded.** First click: button flips to "Unpin current task", a chip "Aimswebplus / Testing" appears, empty-state text disappears. Second click: reverts to empty-state text and "Pin current task" | P0 | AC-28 |
| TM-052 | Pin control only appears once both Project and Task are selected | TD-1 | 1. Load idle with nothing selected 2. Select only a Project 3. Also select a Task | **Live-grounded.** No pin button while unselected; pin button appears only after both Project and Task are chosen | P1 | AC-28 |
| TM-053 | Clicking a pinned-favorite chip re-populates the selectors | TD-1, ≥1 favorite pinned | 1. Clear/change the current selection 2. Click a Favorites chip | Selectors re-populate to the chip's project+task, enabling Start. **Live-grounded via the equivalent Recent Activity chip mechanic (TM-055, same underlying repopulate handler)** — the Favorites-specific chip itself was pinned/unpinned but not separately re-clicked to repopulate this session; low-risk follow-up, not a gap | P2 | AC-28 |
| TM-054 | Empty-state hint when no favorites pinned | TD-1, zero favorites | 1. Load `/timer` with no favorites pinned | **Live-grounded.** "No pinned tasks yet. Select a project and task above, then click the pin button." shown by default | P2 | AC-28 |
| TM-055 | Recent Activity shows up to 3 most-frequent tasks from the last 7 days, launchable | TD-1 | 1. Inspect Recent Activity 2. Click a chip | **Live-grounded.** 2 chips shown ("Aimswebplus / Testing", "Aimswebplus / Meeting"); clicking "Aimswebplus / Testing" re-populated Project=Aimswebplus, Task=Testing and enabled "Start timer" | P1 | AC-29 |
| TM-056 | Empty-state text when no recent activity in the last 7 days | TD-10 | 1. Load `/timer` for a member with zero logs in the last 7 days | "No recent activity found in the last 7 days." shown. **Needs setup** — this account has recent activity every session; not reproducible without a fresh/reset account | P3 | AC-29 |
| TM-057 | Yesterday summary strip shows hours/billable%/top task | TD-1, time logged yesterday | 1. Load `/timer` for a member who logged time yesterday | **Live-grounded.** "Yesterday" / "14h 39m logged" / "82% billable" / "Top: Testing" | P1 | AC-30 |
| TM-058 | Yesterday summary is hidden entirely when nothing was logged yesterday | TD-10 | 1. Load `/timer` for a member with zero logs yesterday | Strip does not render at all (not an empty state — fully absent). **Needs setup** — this account logged 14h 39m yesterday every session this run; not reproducible without a fresh/reset account | P2 | AC-30 |

---

## 7. Cross-cutting / non-functional (AC-31, AC-32, AC-33)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| TM-059 | All timer actions carry workspace-scoping headers | TD-1 | 1. Start/pause/resume/stop a timer while inspecting request headers | **Live-grounded.** Every `/timer/*` and `/timer/active` request carried `x-auth-scope: client` and `x-workspace-id: <Integritas's workspace id>` | P1 | AC-31 |
| TM-060 | Switching workspaces while a timer runs in another workspace is rejected per AC-9 | TD-9 | 1. Start a timer in workspace A 2. Switch active workspace to B 3. Attempt to start a timer in B | Rejected via the same "another workspace" conflict path as AC-9. **Needs setup** — single-workspace account this session, same gap as TM-013 | P2 | AC-31 |
| TM-061 | Project/task catalog and recent-logs refetch on window focus | TD-1 | 1. Switch away from the `/timer` tab 2. Switch back | Data refetches automatically on window focus (no stale project/task list). **Needs setup** — not reliably observable via the automated Playwright session used this run (would need a real tab-blur/focus cycle plus a way to detect the refetch network call precisely) | P2 | AC-32 |
| TM-062 | Refetch triggered by a workspace-scoped stale-data event | TD-5 (an admin session to mutate data) | 1. While this member's `/timer` tab is open, have an admin edit a project/task/category in the same workspace | Catalog refetches automatically without the member manually reloading. **Needs setup** — requires a second (admin) session acting concurrently; not available this run | P3 | AC-32 |
| TM-063 | Only the member's own timer/tasks/logs are ever shown | TD-1 | 1. Inspect every control and list on `/timer` for any reference to another member's active timer, tasks, or logs | No other member's data appears anywhere on the page — the only data surfaced belongs to `peter123`. **Code-verified only** — this is inherently unfalsifiable from a single-account session; would need a second account's data to exist and be checked for leakage to fully verify | P1 | AC-33 |

---

## Coverage summary

All 33 ACs (AC-1–AC-33) from `docs/qa/user_stories/Timer_Member.md` are covered by at least one scenario above (63 scenarios total: TM-001–TM-063). Scenarios that could not be walked live this session are explicitly marked **"Needs setup"** or **"Code-verified only"** with the specific missing precondition (second workspace, second/admin session, 8+ hour idle window, Jira-connected account, or a fresh/zero-activity account) rather than silently skipped or guessed at.

**Key finding to flag for Step 3+ (not this pass's job to resolve, but noted for whoever executes next):** AC-4's "no projects assigned" empty state, which the source doc's own header claims was live-confirmed at an earlier date, is **not reproducible on the current test account** — `peter123@yopmail.com` / "Integritas" now has an assigned project. Whoever runs the next QA pass should either find/create a genuinely zero-project Member account to re-confirm AC-4, or treat the source doc's earlier confirmation as sufficient historical evidence and move on.
