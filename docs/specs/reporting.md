# Reporting spec

## User-visible outcome

- **Admins** view workspace dashboard aggregates (hours by project, by user, trends) for a date range.
- **Members** view personal summary via `/reporting/me` (where exposed in client).

## API

| Method | Route | Roles | Contract |
|--------|-------|-------|----------|
| GET | `/reporting/dashboard` | ADMIN | [reporting.dto.ts](../../packages/contracts/src/dto/reporting.dto.ts) |
| GET | `/reporting/me` | ADMIN, MEMBER | reporting.dto |

Controller: [reporting.controller.ts](../../apps/api/src/modules/reporting/interface/http/reporting.controller.ts)

Query parameters: `from`, `to` (ISO datetimes), optional `projectId`, `userId`.

## Behavior

- Aggregates **time logs** in the workspace for the period.
- Billable amounts use the same rate resolution as [billing.md](./billing.md).
- Shared aggregation logic with export: [time-aggregation.service.ts](../../apps/api/src/modules/reporting/application/time-aggregation.service.ts)

## Given / When / Then

**When** ADMIN GETs `/reporting/dashboard` with a valid range  
**Then** response includes workspace-level totals and breakdowns used by the admin dashboard charts.

**When** user GETs `/reporting/me`  
**Then** only that user’s logs in the workspace are included.

## UI

- Admin: [apps/admin/src/app/(admin)/dashboard/page.tsx](../../apps/admin/src/app/(admin)/dashboard/page.tsx)
- Client timesheet may use `/reporting/me` for “My week summary”.

## Edge cases

- Empty range returns zero totals, not an error.
- Export totals for the same filters should match dashboard aggregates (see export tests).
