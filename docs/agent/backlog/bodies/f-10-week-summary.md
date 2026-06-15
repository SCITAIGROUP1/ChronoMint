## Summary

Mount existing MyWeekSummary component on member dashboard using member-data store.

## Feature

| Domain | F-10 — Reporting |
| Layer | Client |
| MVP | In scope |

## PM

- **Priority:** P2
- **Lane:** backlog

## BA

**User story:** As a member, I want to see my week summary on the dashboard, so that I track hours without opening timesheet.

**Acceptance criteria:**

- [ ] **AC-1:** Given a logged-in MEMBER on `/dashboard`, when the page loads, then MyWeekSummary shows total hours for current week.
- [ ] **AC-2:** Given a member with no logs this week, when dashboard loads, then summary shows 0h (not error).
- [ ] **AC-3:** Given API failure on `/reporting/me`, when dashboard loads, then widget shows retry or graceful empty state.

**Spec:** `docs/specs/reporting.md`

**Out of scope:** Revenue, billable amounts, budget widgets

## QA verification matrix

| AC   | Type   | Automated                                    | Manual steps                       | Pass |
| ---- | ------ | -------------------------------------------- | ---------------------------------- | ---- |
| AC-1 | E2E    | `apps/client/e2e/dashboard.spec.ts` (extend) | Login member, check summary widget | [ ]  |
| AC-2 | E2E    | same — empty week                            | Seed or mock empty week            | [ ]  |
| AC-3 | Manual | N/A                                          | Simulate API 500                   | [ ]  |

## Dev

| Target | `features/dashboard/dashboard-page.tsx`, `components/my-week-summary.tsx`, `stores/member-data.store.ts` |

<SYNC_BLOCK status="TODO" task_id="GH-XXX" lane="backlog" />
