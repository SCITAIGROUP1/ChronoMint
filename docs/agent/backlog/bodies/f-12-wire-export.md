## Summary

Expose existing TimesheetExport component on the member timesheet page so members can download their hours as CSV.

## Feature

| Field  | Value                      |
| ------ | -------------------------- |
| Domain | F-12 — Export (hours only) |
| Layer  | Client                     |
| Health | Gap                        |
| MVP    | In scope                   |

## PM

- **Priority:** P1
- **Lane:** ready
- **Parent epic:** Link to [Epic][F-12] after epic issue created
- **Dependencies:** None
- **Success metric:** Seed member downloads CSV with ≥1 row in QA

## BA

**User story:** As a workspace member, I want to export my timesheet from the calendar page, so that I can archive my hours without admin help.

**Acceptance criteria:**

- [ ] **AC-1:** Given a MEMBER with ≥1 timelog in the visible week on `/timesheet`, when they click "Export", then a `.csv` file downloads within 5s containing columns Date, Project, Task, Duration.
- [ ] **AC-2:** Given a MEMBER with zero logs in the selected range, when they click "Export", then a toast explains "No entries to export" and no file downloads.
- [ ] **AC-3:** Given an unauthenticated user, when they open `/timesheet` and trigger export, then they are redirected to `/login` (no CSV).

**Spec:** `docs/specs/export.md`

**Out of scope:** PDF, invoice, billable amounts, admin export wizard

## QA verification matrix

| AC   | Type       | Automated                                                        | Manual steps                                                      | Pass |
| ---- | ---------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| AC-1 | E2E        | `apps/client/e2e/timesheet.spec.ts` — "member exports CSV" (new) | 1. Login `member@seed.kloqra` 2. /timesheet 3. Export 4. Open CSV | [ ]  |
| AC-2 | E2E        | same spec — "empty week shows toast" (new)                       | Use week with no logs                                             | [ ]  |
| AC-3 | E2E        | `apps/client/e2e/smoke.spec.ts` — unauthenticated                | Logout, attempt export                                            | [ ]  |
| —    | Regression | `pnpm --filter @kloqra/client test:e2e timesheet`                | Full timesheet suite green                                        | [ ]  |

## Dev

| Role | FE |
| Branch | `feat/GH-XXX-wire-timesheet-export` |
| Target paths | `apps/client/src/features/timesheet/timesheet-page.tsx`, `apps/client/src/components/timesheet-export.tsx` |
| Contracts | N/A |

**Execution order:** failing Playwright tests → wire component → lint

<AGENT_INSTRUCTION role="FE" task_id="GH-XXX">

- Target: apps/client/src/features/timesheet/timesheet-page.tsx
- TDD: apps/client/e2e/timesheet.spec.ts must fail first for AC-1..3
  </AGENT_INSTRUCTION>

## Evidence

- `apps/client/src/components/timesheet-export.tsx` (exists, zero imports)
- `POST /export/me` API shipped

<SYNC_BLOCK status="TODO" task_id="GH-XXX" lane="ready" />
