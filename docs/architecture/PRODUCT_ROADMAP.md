# Kloqra product roadmap

Product features beyond the core timer/timesheet loop. Shipped features link to specs under `docs/specs/`; export details in [export.md](../specs/export.md).

## Role model (reminder)

| App                        | Audience           | Purpose                                                |
| -------------------------- | ------------------ | ------------------------------------------------------ |
| **Client** (`apps/client`) | Workspace `MEMBER` | Log time on assigned project teams                     |
| **Admin** (`apps/admin`)   | Workspace `ADMIN`  | Operate the org: projects, billing, analytics, exports |

See [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) for workspace vs project team boundaries.

---

## Shipped (baseline)

| Area                                                                    | Client  | Admin              | Spec                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timer, timesheet, tasks                                                 | Yes     | —                  | [timer.md](../specs/timer.md), [timelogs.md](../specs/timelogs.md)                                                                                                        |
| My projects / team invites                                              | Yes     | Projects + invites | [projects.md](../specs/projects.md)                                                                                                                                       |
| Auth & workspace                                                        | Yes     | Yes                | [auth-workspace.md](../specs/auth-workspace.md)                                                                                                                           |
| Workspace analytics dashboard                                           | —       | Yes                | [reporting.md](../specs/reporting.md)                                                                                                                                     |
| Team live presence                                                      | —       | Yes                | [presence.md](../specs/presence.md)                                                                                                                                       |
| Billing rates                                                           | —       | Yes                | [billing.md](../specs/billing.md)                                                                                                                                         |
| Multi-report export wizard                                              | —       | Yes                | [export.md](../specs/export.md)                                                                                                                                           |
| Export scale-up (preview, presets, schedules, shares, extended reports) | —       | Yes                | [export.md](../specs/export.md)                                                                                                                                           |
| Export my timesheet (API) + My week summary widget                      | Partial | —                  | [export.md](../specs/export.md) — `POST /export/me` shipped; client `TimesheetExport` / `MyWeekSummary` UI not wired ([FEATURE_INVENTORY](../agent/FEATURE_INVENTORY.md)) |
| Timesheet submit / approve / amendments                                 | Yes     | Yes                | [timelogs.md](../specs/timelogs.md) — client `/submissions`, admin `/approvals`                                                                                           |
| Notifications inbox                                                     | Yes     | Yes                | web-shared `NotificationsPage`                                                                                                                                            |
| AI assistant (member)                                                   | Yes     | —                  | [assistant.md](../specs/assistant.md)                                                                                                                                     |
| Member onboarding tour                                                  | Yes     | —                  | `apps/client/src/features/onboarding/`                                                                                                                                    |

---

## Recommended build order

> **MVP board scope** excludes budget, revenue, billing features, and client portal. See [FEATURE_INVENTORY](../agent/FEATURE_INVENTORY.md) and GitHub Project #4.

### Phase B — Finance & ops (post-MVP)

Deferred for current MVP kanban (`mvp:out-of-scope`).

| Feature                     | App   | Description                                |
| --------------------------- | ----- | ------------------------------------------ |
| **Budget burn-down widget** | Admin | Chart + alerts on `budgetHours` vs logged. |
| **Invoice generation**      | Admin | Draft invoice from billable export.        |

### Phase C — Workflow & accountability

| Feature                        | App            | Status / notes                                                   |
| ------------------------------ | -------------- | ---------------------------------------------------------------- |
| **Timesheet submit / approve** | Client + Admin | **Shipped** — see Shipped table                                  |
| **Locked periods**             | API            | Partial — timesheet lock service exists; payroll-week policy TBD |
| **Budget / idle alerts**       | Admin          | Post-MVP                                                         |
| **Project detail view**        | Admin          | Partial — admin project tabs shipped; dedicated dashboard TBD    |

### Phase D — Scale & external users

Larger surface area; defer until B/C are stable.

| Feature                             | App          | Description                                                     |
| ----------------------------------- | ------------ | --------------------------------------------------------------- |
| **Client portal**                   | New or Admin | Post-MVP — external client org login                            |
| **Scheduled export email delivery** | Admin        | SMTP delivery for existing `ExportSchedule` runs.               |
| **Cross-workspace export**          | Admin        | Agencies with multiple workspaces (out of scope for v1 export). |
| **Multi-currency / tax lines**      | Admin        | Beyond USD label; GST/VAT columns.                              |

---

## Client app (`apps/client`) — planned features

Members should **capture time**, **see their progress**, and **close the loop** — without workspace-wide money or team comparisons.

| Feature                | Priority | Notes                                                               |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| **Timesheet submit**   | Shipped  | `/submissions`, admin `/approvals`                                  |
| **Personal goals**     | Nice     | Optional daily target (e.g. 8h); no $ shown unless policy allows.   |
| **Quick actions**      | Nice     | Duplicate yesterday; pin favorite project/task.                     |
| **Reminders**          | Phase D  | Email/push: “No time logged Tuesday.”                               |
| **Mobile / PWA**       | Phase D  | Timer usable on phone; offline queue later.                         |
| **Read-only own rate** | Optional | Show member’s billable rate on entry if admin enables transparency. |

**Do not give members:** team utilization rankings, other members’ hours, workspace revenue totals, billing configuration, admin export wizard.

---

## Admin app (`apps/admin`) — planned features

Admins **configure**, **observe**, **bill**, and **export**.

| Feature                | Priority  | Notes                                                                                      |
| ---------------------- | --------- | ------------------------------------------------------------------------------------------ |
| **Invoice generation** | Phase B   | Draft invoice from billable export; PDF template.                                          |
| **Budget burn-down**   | Phase B   | Chart + alerts on `budgetHours` vs logged.                                                 |
| **Utilization report** | Phase B   | Member × week: logged vs expected hours (e.g. 40h).                                        |
| **Period compare**     | Nice      | This month vs last: Δ hours / Δ revenue.                                                   |
| **Task-level rollup**  | Nice      | Hours by task for SOW/retro.                                                               |
| **Workspace settings** | Phase B/C | Timezone, week start, rounding (15 min), default billable — use `Workspace.settings` JSON. |
| **Member management**  | Phase C   | Deactivate member, change role, resend invite (extend `/workspace`).                       |
| **Admin time logging** | Low       | Optional timer/timesheet in admin for internal projects only.                              |

---

## API & contracts (cross-cutting)

| Item                                       | Phase   | Notes                                            |
| ------------------------------------------ | ------- | ------------------------------------------------ |
| `POST /export` presets body                | B       | Optional `presetId` or inline saved config.      |
| `GET /reporting/projects/:id`              | B       | Project-scoped dashboard.                        |
| `POST /timelogs/submit`, `PATCH …/approve` | Shipped | Timesheets module — see timelogs spec            |
| `Workspace.settings` schema in contracts   | B       | Zod SSOT for rounding, timezone, features flags. |
| Webhooks on `TimeLog` events               | D       | See [FUTURE_SCOPE.md](./FUTURE_SCOPE.md).        |

---

## Explicitly out of scope (for now)

- AI smart-categorization, idle arbitrator, IDE/Jira plugins — see [FUTURE_SCOPE.md](./FUTURE_SCOPE.md)
- Cross-workspace billing consolidation
- Replacing accounting tools (QuickBooks/Xero sync) — export-only integration path first

---

## How this doc stays current

1. When a feature ships, move it to **Shipped** and link the PR or module path.
2. Keep export-specific column/report design in the export plan, not here.
3. Prefer one phase per epic PR to keep reviews small.
