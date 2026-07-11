# Exploratory Test Results — Member Timer (`/timer`)

**Module:** `timer-member`
**Test plan executed:** `specs_qa/timer-member.md` (TM-001–TM-063, 33 ACs)
**Environment:** https://chrono-mint-client.vercel.app/, account `peter123@yopmail.com` / workspace "Integritas"
**Tooling:** Playwright MCP (real browser), this session's run
**Screenshots:** `specs_qa/exploratory/timer-member/*.png`

## Summary

| Metric | Count |
|---|---|
| Total scenarios in plan | 63 |
| Executed live this session (Pass) | 37 |
| Not verified (needs setup / code-verified only, unchanged from planning pass) | 26 |
| Fail (real discrepancy found) | 0 |

No new defects or copy/behavior mismatches were found. Every scenario that could be driven live this session matched the test plan's documented expected result **verbatim** (button labels, banner text, hint text, tab-title formats, tooltip text, empty-state copy). One previously-flagged "not independently tested" item (TM-027, Space-to-stop) was independently confirmed working this session — see "Notable findings" below. Two real timer entries were created during testing and were deleted via Time Tracker's Delete action afterward; the account's Today/Week totals were verified to return to their pre-session baseline (4.51h / 19.17h) after cleanup.

## Notable findings (surprises / follow-ups for the next pass)

1. **TM-027 resolved positively.** The test plan carried this forward as "not independently re-triggered this session" (planning pass avoided creating an extra time-log entry). This pass exercised it directly: with a timer running, pressing `Space` with focus outside any input stopped the timer via the normal Stop & save flow — confirmed by the tab title reverting from `⏱️ 00:01:55 — Kloqra` to plain `Kloqra`. No gap; the shortcut works as documented.
2. **TM-024's literal mouse-click path is still not independently exercised.** This session (like a prior pass) stopped the timer only via keyboard shortcuts (`Space` and `Ctrl+Shift+T`), not by clicking the on-screen "Stop & save" button itself, to limit the number of throwaway time-log entries. The resulting stop behavior (TimeLog created, UI reset, ring at `00:00:00`, entry visible in Time Tracker) was confirmed via the keyboard-triggered path, which per the codebase calls the same stop handler — but the mouse click itself remains a quick, low-risk follow-up rather than a full gap.
3. **AC-4 "no projects assigned" empty state remains unreproducible** on this account (still has the "Aimswebplus" project assigned) — consistent with the planning pass's discrepancy note. No new information this session; still recommend sourcing a genuinely zero-project Member account for a future pass, or accepting the source doc's earlier historical confirmation.
4. All Daily Progress sidebar values (gauge %, hrs/target, "Need X more hours", 7-day tooltips, milestone tooltips) updated live and consistently in-step with the running timer across repeated snapshots — no lag or stale-render issues observed.
5. No console errors attributable to the application were observed (the only console errors were from a Kaspersky browser-extension network probe, unrelated to the app).

---

## Detailed results

| ID | Title | Status | Actual result this session | Screenshot |
|---|---|---|---|---|
| TM-001 | Member can reach Timer via left-nav link | PASS | Confirmed: "Timer" link present in sidebar nav alongside Dashboard, Time Tracker, Timesheet, Submissions, Notifications, My projects; navigates to `/timer` | TM-001-002-idle-state.png |
| TM-002 | Header copy in the not-tracking state | PASS | Heading "Timer"; subtitle "Choose a project and task before you start tracking." — verbatim match | TM-001-002-idle-state.png |
| TM-003 | Header copy switches once tracking starts | PASS | Subtitle changed to "Manage your ongoing timer. Pausing allows taking breaks without breaking logs." immediately on start, no reload | TM-011-015-017-tracking-state.png |
| TM-004 | Starting a second timer while one is active is server-rejected | NOT VERIFIED | Needs setup — true concurrent-session start not exercised, to avoid corrupting the single live timer mid-session (same as planning pass) | — |
| TM-005 | "No projects assigned" empty state | NOT VERIFIED | Needs setup / discrepancy carried forward — account still has 1 assigned project ("Aimswebplus"); state not reproducible on this account this session either | — |
| TM-006 | Project selector is a searchable dropdown; Task disabled until project chosen | PASS | Opens searchable popup with "Suggestions" listbox showing "Integritas · Aimswebplus"; Task combobox stayed disabled with "Select a project first" until picked | TM-006-project-combobox-open.png |
| TM-007 | Task list grouped by category, filtered to selected project | PASS | Task combobox enabled after project pick; options grouped under **BA** → Spec Implementation, **Development** → Code Implementation, **QA** → Meeting, Testing — verbatim match | TM-007-task-grouped-categories.png |
| TM-008 | "No tasks for this project" empty state | NOT VERIFIED | Needs setup — this account's only project has tasks | — |
| TM-009 | Start button disabled until both Project and Task chosen | PASS | Confirmed disabled with Project-only selected; became enabled only once Task also selected | TM-009-project-only-start-disabled.png, TM-009-both-selected-start-enabled.png |
| TM-010 | Busy "Starting…" label mid-request | NOT VERIFIED | Request completed too fast to reliably capture the transient label this session (code-verified only, consistent with planning pass) | — |
| TM-011 | Successful start switches to Tracking Time card | PASS | `POST /timer/start` fired with taskId; UI switched to "Tracking Time" card immediately; subsequent `GET /timer/active` confirmed new state. Toast itself dismissed before it could be screenshotted (consistent with plan) | TM-011-015-017-tracking-state.png |
| TM-012 | Start fails with generic message — same-workspace conflict | NOT VERIFIED | Needs setup — requires a genuine concurrent session | — |
| TM-013 | Start fails with specific message — cross-workspace conflict | NOT VERIFIED | Needs setup — account belongs to only one workspace | — |
| TM-014 | Timer controls disabled while impersonating | NOT VERIFIED | Needs setup — no impersonation-capable account available | — |
| TM-015 | Animated ring fills, elapsed ticks per second, "Recording" label | PASS | Ring/"Recording" label confirmed; elapsed ticked up across repeated snapshots (e.g. 00:00:05 → 00:00:19 → 00:00:26...) | TM-011-015-017-tracking-state.png |
| TM-016 | Ring turns amber / "Paused Break" label when paused | PASS | Label switched to "Paused Break" on Pause click; elapsed time confirmed frozen at `00:01:10` across a 4-second wait | TM-016-021-034-paused-state.png |
| TM-017 | Subtitle shows project color dot + "project — task" | PASS | Subtitle read "Integritas · Aimswebplus · Testing" with leading color dot | TM-011-015-017-tracking-state.png |
| TM-018 | Warning hint when active task no longer in member's list | NOT VERIFIED | Needs setup — requires a second admin session to mutate task assignment mid-timer | — |
| TM-019 | Note field accepts free text incl. space char | PASS | Typed "QA note with a space typed" character-by-character; accepted without side effects; 2000-char ceiling not boundary-tested (same as plan) | TM-019-030-note-field-space-ignored.png |
| TM-020 | Jira issue picker one-click buttons | NOT VERIFIED | Needs setup — no connected Jira integration on this workspace | — |
| TM-021 | Pause stops accumulation, shows banner + button flip | PASS | `POST /timer/pause` fired; button flipped to green "Resume"; banner "⏸ Timer is paused. Resume when you're back, or stop to save." appeared verbatim | TM-016-021-034-paused-state.png |
| TM-022 | Resume continues from previously accumulated elapsed time | PASS | `POST /timer/resume` fired; ring returned to "Recording"; elapsed resumed counting from `00:01:10` (not from 0) | TM-022-resume-continues.png |
| TM-023 | Pause/Resume/Stop mutual busy-disable | NOT VERIFIED | Requests completed too fast to capture transient busy/disabled states this session (code-verified only) | — |
| TM-024 | Stop & save creates TimeLog, resets UI, merges into caches | PASS (with caveat) | Confirmed via keyboard-triggered stops (Space, Ctrl+Shift+T — same underlying handler): ring reset to `00:00:00`, header reverted to idle copy, note field cleared, and both resulting entries appeared correctly in Time Tracker without a manual refresh. The literal mouse-click on "Stop & save" itself was not independently exercised this session (see Notable Findings #2) | TM-024-027-035-stop-via-space-idle.png |
| TM-025 | Stop with "no active timer" server error self-heals to idle | NOT VERIFIED | Needs setup — requires a race with another session/auto-stop | — |
| TM-026 | `Space` starts the timer when idle | PASS | Timer started immediately on Space press (focus outside inputs); tab title flipped to `⏱️ 00:00:0X — Kloqra` | TM-026-space-starts-timer.png |
| TM-027 | `Space` stops the timer when tracking | PASS | Independently confirmed this session (previously flagged as not re-tested): title reverted from `⏱️ 00:01:55 — Kloqra` to plain `Kloqra` after Space press | TM-024-027-035-stop-via-space-idle.png |
| TM-028 | `Ctrl+Shift+T` toggles Start/Stop | PASS | Timer (started via Space) stopped on Ctrl+Shift+T; tab title reverted to plain `Kloqra` | — |
| TM-029 | `Shift+Space` toggles Pause/Resume while tracking | PASS | First press: title → `⏸️ HH:MM:SS`, label "Paused Break". Second press: reverted to `⏱️ HH:MM:SS`, label "Recording" | TM-029-shift-space-pause.png, TM-029-shift-space-resume.png |
| TM-030 | Shortcuts ignored while focus is in Note field | PASS | Typed "QA note with a space typed" (incl. embedded space keystrokes) into Note field; timer remained "Recording" / tab title stayed on recording emoji throughout | TM-019-030-note-field-space-ignored.png |
| TM-031 | On-screen shortcut hint while tracking | PASS | "Press Space to stop • Shift+Space to pause/resume break" — verbatim match | TM-011-015-017-tracking-state.png |
| TM-032 | On-screen shortcut hint while idle | PASS | "Tip: Press Space or Ctrl+Shift+T to start" — verbatim match | TM-001-002-idle-state.png |
| TM-033 | Tab title updates live while recording | PASS | Title incremented across repeated snapshots (00:00:02 → 00:00:07 → 00:00:19 → 00:00:26 → 00:00:58, etc.) | — |
| TM-034 | Tab title switches to pause emoji when paused | PASS | Title switched to `⏸️ 00:01:10 — Kloqra` on pause | TM-016-021-034-paused-state.png |
| TM-035 | Tab title reverts to app name when stopped | PASS | Title reverted to plain `Kloqra` on stop (via Space). Page-unmount variant not separately re-verified (same as plan, low-risk) | TM-024-027-035-stop-via-space-idle.png |
| TM-036 | Stale-warning dialog at 8h threshold | NOT VERIFIED | Needs setup — requires an 8+ hour unattended window | — |
| TM-037 | "Keep running" snoozes 1 hour | NOT VERIFIED | Needs setup — depends on TM-036 | — |
| TM-038 | "Stop & save logged time" from stale dialog | NOT VERIFIED | Needs setup — depends on TM-036 | — |
| TM-039 | "Discard" clears timer with no time log | NOT VERIFIED | Needs setup — depends on TM-036 | — |
| TM-040 | Dialog re-appears after 1-hour snooze expires | NOT VERIFIED | Needs setup — requires additional hour beyond TM-036 | — |
| TM-041 | Stale-warning dialog disabled while impersonating | NOT VERIFIED | Needs setup — no impersonation session + 8h window | — |
| TM-042 | Hard auto-stop force-stops past ceiling | NOT VERIFIED | Needs setup — requires very long unattended window + env var value | — |
| TM-043 | Client detects `autostopped: true` on next poll | NOT VERIFIED | Needs setup — depends on TM-042 | — |
| TM-044 | Client polls `GET /timer/active` ~30s + on actions | PASS (mechanism) | Confirmed `GET /timer/active` fires on mount and immediately after every start/pause/resume/stop action via network log; exact 30s cadence not stopwatch-timed this session (interval itself code-verified only) | — |
| TM-045 | Daily Progress gauge reflects logged + live elapsed time | PASS | Gauge updated live from "56% / 4.51 hrs" to "57% / 4.55 hrs" as the running timer accrued, with "Need X more hours" shrinking in step | — |
| TM-046 | Inline daily-target edit (0.5–24h range, persists) | PASS (UI only) | Spinbutton defaulting to "8" with Save/Cancel appeared inline on pencil click; canceled without saving to avoid altering the shared account's real target. Boundary/persistence still not tested (same as plan) | TM-046-edit-daily-goal-inline.png |
| TM-047 | "Need X more hours today" hint text | PASS | Text updated live in step with elapsed time ("Need 3.49" → "3.47" → "3.46" → "3.45 more hours today.") | — |
| TM-048 | Goal-reached state at/above target | NOT VERIFIED | Needs setup — account stayed well under target (~57%) all session | — |
| TM-049 | 7-day Mon–Sun grid with tooltips, marks weekends/no-log days | PASS | Tooltips confirmed via accessibility tree: "Jul 6: 0.0 / 8h (No logs)", "Jul 9: 14.7 / 8h (Goal Met)" (✓), "Jul 10: 4.5/8h (In Progress)" (~), "Jul 11/12: (Weekend)" | TM-049-weekly-grid-tooltip.png |
| TM-050 | Milestone badges evaluated over last 14 days | PASS | All 4 badges present (Early Bird / Super Logger / Streak Champ / Perfect Week) with descriptive tooltip text; "Super Logger" shown achieved/highlighted, others not-yet-achieved | TM-050-milestone-tooltip.png |
| TM-051 | Pin/unpin current project+task | PASS | Pin click: button flipped to "Unpin current task", chip "Aimswebplus / Testing" appeared, empty-state text disappeared. Unpin click reverted both | TM-051-pinned-favorite-chip.png |
| TM-052 | Pin control only appears once both Project and Task selected | PASS | No pin button while unselected or Project-only; appeared only once both Project and Task chosen | TM-009-both-selected-start-enabled.png |
| TM-053 | Clicking a pinned-favorite chip re-populates selectors | PASS | Changed Task to "Meeting", then clicked the pinned "Aimswebplus / Testing" chip — Task reverted to "Testing", confirming repopulation | TM-053-favorite-chip-repopulate.png |
| TM-054 | Empty-state hint when no favorites pinned | PASS | "No pinned tasks yet. Select a project and task above, then click the pin button." shown both initially and after unpinning | TM-054-empty-favorites-restored.png |
| TM-055 | Recent Activity shows most-frequent tasks, launchable | PASS | 2 chips shown ("Aimswebplus / Testing", "Aimswebplus / Meeting"); clicking "Aimswebplus / Meeting" repopulated Project=Aimswebplus, Task=Meeting and enabled "Start timer" | TM-055-recent-activity-chip-repopulate.png |
| TM-056 | Empty-state text when no recent activity | NOT VERIFIED | Needs setup — account has activity every session | — |
| TM-057 | Yesterday summary strip shows hours/billable%/top task | PASS | "Yesterday" / "14h 39m logged" / "82% billable" / "Top: Testing" — verbatim match | TM-001-002-idle-state.png |
| TM-058 | Yesterday summary hidden when nothing logged yesterday | NOT VERIFIED | Needs setup — account logged 14h 39m yesterday this session | — |
| TM-059 | All timer actions carry workspace-scoping headers | PASS | Confirmed via network request inspection: `x-auth-scope: client`, `x-workspace-id: d750c4fb-7931-480b-8f32-0877ff668ddb` present on `/timer/*` calls | — |
| TM-060 | Switching workspaces mid-timer is rejected per AC-9 | NOT VERIFIED | Needs setup — single-workspace account | — |
| TM-061 | Catalog/recent-logs refetch on window focus | NOT VERIFIED | Not reliably observable via this Playwright session (same as plan) | — |
| TM-062 | Refetch on workspace-scoped stale-data event | NOT VERIFIED | Needs setup — requires concurrent admin session | — |
| TM-063 | Only the member's own timer/tasks/logs are ever shown | NOT VERIFIED | Code-verified only — inherently unfalsifiable from a single-account session | — |

---

## Cleanup performed

Two real timer entries were created while exercising TM-011/015/016/017/019/021/022/024/027/030 (mouse-driven flow, ~1m50s, note "QA note with a space typed") and TM-026/028 (keyboard-only flow, ~15-20s, no note). Both were deleted via Time Tracker → Entry actions → Delete → confirm "Delete" in the resulting dialog. Verified the account's Time Tracker totals returned to the pre-session baseline: Today (Fri Jul 10) 4.51h / This Week 19.17h, entry list restored to its original 12 rows for the day.
