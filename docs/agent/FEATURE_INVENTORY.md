# Kloqra MVP — Feature Inventory

> Code-first audit. Generated for GitHub Project #4 bootstrap.  
> **MVP excludes:** budget, revenue, billing, client portal.  
> **Deprecated:** `TASK_BOARD.json` (see `docs/agent/archive/`).

Last scan: run `node .cursor/skills/kloqra-github-kanban/scripts/inventory-features.mjs`

## Summary

| Health     |            Count |
| ---------- | ---------------: |
| Shipped    |                7 |
| Gap        |                8 |
| Out of MVP | 1 (F-09 Billing) |

---

## F-01 Auth & session — Shipped

| Layer  | Evidence                              |
| ------ | ------------------------------------- |
| API    | `apps/api/src/modules/auth`           |
| Client | `apps/client/src/app/(auth)/`         |
| Admin  | `apps/admin/src/app/login/`           |
| Spec   | `docs/specs/auth-workspace.md`        |
| Tests  | `auth.service.spec.ts`, `auth.e2e.ts` |

**Gaps:** None (register stub is intentional 403).

---

## F-02 Users & profile — Gap

| Layer        | Evidence                                        |
| ------------ | ----------------------------------------------- |
| API          | `apps/api/src/modules/users`                    |
| Client/Admin | web-shared `ProfilePage`, `AccountSettingsPage` |
| Spec         | `docs/specs/user-profile.md`                    |

**Gaps:**

- `ROUTES.USERS.ACTIVITY` defined in contracts — no controller

**Board:** Story P2 — implement or remove activity route

---

## F-03 Workspace & RBAC — Gap

| Layer | Evidence                                |
| ----- | --------------------------------------- |
| API   | `apps/api/src/modules/workspace`        |
| Admin | `features/workspace/workspace-page.tsx` |
| Spec  | `docs/specs/auth-workspace.md`          |

**Gaps:**

- `workspace.controller.ts` uses `throw new Error("Forbidden")` — use `DomainException`

---

## F-04 Projects & invites — Shipped

| Layer  | Evidence                                   |
| ------ | ------------------------------------------ |
| API    | `apps/api/src/modules/projects`            |
| Client | `features/projects/`, `app/invite/[token]` |
| Admin  | `features/projects/`                       |
| Spec   | `docs/specs/projects.md`                   |

---

## F-05 Categories & tasks — Gap

| Layer  | Evidence                              |
| ------ | ------------------------------------- |
| API    | `modules/categories`, `modules/tasks` |
| Admin  | `features/categories/`                |
| Client | read-only tasks tab                   |

**Gaps:**

- `features/tasks/tasks-page.tsx` orphaned; `/tasks` → `/projects` redirect

---

## F-06 Timer — Shipped

| Layer  | Evidence                       |
| ------ | ------------------------------ |
| API    | `modules/timer`                |
| Client | `features/timer/`              |
| Spec   | `docs/specs/timer.md`          |
| E2E    | `apps/client/e2e/` timer flows |

---

## F-07 Timelogs & tracker — Shipped

| Layer  | Evidence                 |
| ------ | ------------------------ |
| API    | `modules/timelogs`       |
| Client | `features/time-tracker/` |
| Spec   | `docs/specs/timelogs.md` |

---

## F-08 Timesheets & approvals — Shipped

| Layer  | Evidence                                       |
| ------ | ---------------------------------------------- |
| API    | `TimesheetsController`, amendments, reminders  |
| Client | `features/submissions/`, `features/timesheet/` |
| Admin  | `features/approvals/` (3 tabs)                 |
| Spec   | `docs/specs/timelogs.md`                       |

**Note:** Roadmap Phase C still lists this as planned — doc debt only.

---

## F-09 Billing — Out of MVP

Do not file board items. Label `mvp:out-of-scope` if referenced.

---

## F-10 Reporting & dashboards — Gap

| Layer  | Evidence                              |
| ------ | ------------------------------------- |
| API    | `modules/reporting`                   |
| Client | `features/dashboard/`                 |
| Admin  | `features/dashboard/` (hours widgets) |
| Spec   | `docs/specs/reporting.md`             |

**Gaps:**

- `components/my-week-summary.tsx` not mounted on any page

**Excluded:** budget-burndown, revenue-trend widgets (post-MVP)

---

## F-11 Presence & team live — Gap

| Layer | Evidence                      |
| ----- | ----------------------------- |
| API   | `modules/presence`            |
| Admin | `features/team/team-page.tsx` |
| Spec  | `docs/specs/presence.md`      |

**Gaps:**

- No `*.spec.ts` in presence module

---

## F-12 Export (hours only) — Gap

| Layer  | Evidence                                      |
| ------ | --------------------------------------------- |
| API    | `modules/export` (`POST /export/me`)          |
| Client | `components/timesheet-export.tsx` **unwired** |
| Admin  | `features/exports/`                           |
| Spec   | `docs/specs/export.md`                        |

**Gaps:**

- Mount `TimesheetExport` on member timesheet
- Legacy `GET /export` unused by frontends

**Excluded:** invoice wizard, revenue columns

---

## F-13 Notifications — Gap

| Layer | Evidence                       |
| ----- | ------------------------------ |
| API   | `modules/notifications`        |
| Apps  | web-shared `NotificationsPage` |

**Gaps:** `NotificationsDispatchService` untested

---

## F-14 AI assistant — Partial

| Layer  | Evidence                             |
| ------ | ------------------------------------ |
| API    | `modules/assistant` (external proxy) |
| Client | `features/assistant/`                |
| Spec   | `docs/specs/assistant.md`            |

---

## F-15 Onboarding — Shipped

| Layer  | Evidence                             |
| ------ | ------------------------------------ |
| Client | `features/onboarding/`               |
| E2E    | `apps/client/e2e/onboarding.spec.ts` |

**Gaps:** No `docs/specs/onboarding.md`

---

## F-X Platform & quality — Gap

| Item                                                         | Priority |
| ------------------------------------------------------------ | -------- |
| Prisma DTO leaks (workspace PATCH, timesheet approve/reject) | P1       |
| Slim list DTOs (api_surface_audit)                           | P2       |
| Member export + presence tests                               | P1       |

---

## GitHub backlog

| Source                | File                               | Command                                         |
| --------------------- | ---------------------------------- | ----------------------------------------------- |
| MVP gaps (code audit) | `github-issues.json`               | `post-backlog.mjs`                              |
| Feature tree          | `expand-breakdown.mjs`             | epics + stories + tasks                         |
| **Cursor plans**      | `plans-inventory.json`             | `inventory-plans.mjs` → `expand-from-plans.mjs` |
| Posted manifest       | `plans-posted.json`, `posted.json` | —                                               |

Plans mined from [`.cursor/plans/`](../../.cursor/plans/). Superseded plans (e.g. timesheet workflow — already shipped) are skipped automatically.

Post: `node .cursor/skills/kloqra-github-kanban/scripts/post-backlog.mjs`

## Board

- Project: https://github.com/orgs/SCITAIGROUP1/projects/4
- Skill: `.cursor/skills/kloqra-github-kanban/SKILL.md`
