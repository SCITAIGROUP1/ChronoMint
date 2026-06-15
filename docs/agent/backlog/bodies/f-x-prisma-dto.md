## Summary

Map workspace update and timesheet approve/reject responses to contract DTOs; stop returning raw Prisma rows.

## Feature

| Field  | Value                    |
| ------ | ------------------------ |
| Domain | F-X — Platform & quality |
| Layer  | API                      |
| Health | Gap                      |
| MVP    | In scope                 |

## PM

- **Priority:** P1
- **Lane:** ready
- **Success metric:** API responses match Zod schemas; no `createdAt`/`updatedAt` leaks

## BA

**User story:** As an API consumer, I want mutation responses to match contracts, so that clients never depend on accidental Prisma fields.

**Acceptance criteria:**

- [ ] **AC-1:** Given an ADMIN PATCH on `/workspaces/:id`, when the response returns, then body matches `WorkspaceDto` schema with no extra Prisma keys (`createdAt`, `updatedAt`).
- [ ] **AC-2:** Given an ADMIN approves or rejects a timesheet, when the response returns, then body is `{ ok: true }` or a documented DTO — not a raw Prisma row.
- [ ] **AC-3:** Given invalid workspace id, when PATCH is called, then 403/404 uses `DomainException` format — not `throw new Error("Forbidden")`.

**Spec:** N/A — api_surface_audit plan P0

**Out of scope:** Slim list DTOs (separate story)

## QA verification matrix

| AC   | Type       | Automated                                                    | Manual steps                      | Pass |
| ---- | ---------- | ------------------------------------------------------------ | --------------------------------- | ---- |
| AC-1 | API        | `apps/api/test/workspace.e2e.ts` or module spec (new/extend) | PATCH workspace; assert JSON keys | [ ]  |
| AC-2 | API        | timesheet e2e — approve/reject response shape                | Admin approves pending sheet      | [ ]  |
| AC-3 | API        | workspace e2e — forbidden path                               | Wrong workspace header            | [ ]  |
| —    | Regression | `pnpm --filter @kloqra/api test`                             | Full API tests green              | [ ]  |

## Dev

| Role | BE |
| Target paths | `apps/api/src/modules/workspace/`, `apps/api/src/modules/timelogs/application/timesheets.service.ts` |

<AGENT_INSTRUCTION role="BE" task_id="GH-XXX">

- Target: workspace.service mapper + timesheets approve/reject
- TDD: extend apps/api e2e specs for response whitelist
  </AGENT_INSTRUCTION>

<SYNC_BLOCK status="TODO" task_id="GH-XXX" lane="ready" />
