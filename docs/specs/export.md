# Export spec

## User-visible outcome

- **Admins** run a multi-report export wizard: filters, report types, per-report columns, CSV / Excel / PDF.
- **Members** export their own timesheet from the client app (`POST /export/me`).

Exports query **TimeLog** rows in the active workspace (not `TeamMember` directly). “Team member” in filters means **filter by user**, optionally limited to a project’s team.

Domain note: [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md).

## API

| Method | Route | Roles | Contract |
|--------|-------|-------|----------|
| POST | `/export` | ADMIN | [export.dto.ts](../../packages/contracts/src/dto/export.dto.ts) `exportBodySchema` |
| GET | `/export` | ADMIN | `exportQuerySchema` (simple; default columns) |
| POST | `/export/me` | ADMIN, MEMBER | `memberExportBodySchema` |

Controller: [export.controller.ts](../../apps/api/src/modules/export/interface/http/export.controller.ts)  
Aggregation: [export.service.ts](../../apps/api/src/modules/export/application/export.service.ts), shared [time-aggregation.service.ts](../../apps/api/src/modules/reporting/application/time-aggregation.service.ts)

Filenames: [export-filename.ts](../../packages/contracts/src/export-filename.ts) — e.g. `chronomint-{workspaceSlug}-{from}_to_{to}-{report}.csv`; member scope adds `-my-timesheet`.

## Report catalog (admin)

Admin selects one or more report types; all share the same filters.

### 1. Time entries (`time_entries`)

One row per logged interval. Default columns: workspace, client, project, task, member, email, date, start_time, end_time, hours, billable, rate, amount, description, source.

### 2. Daily summary (`daily_summary`)

Aggregated by date × member × project. Columns: date, member, email, client, project, total_hours, billable_hours, non_billable_hours, billable_amount.

### 3. By project (`by_project`)

One row per project. Columns: project, client, total_hours, billable_hours, non_billable_hours, billable_amount, active_members.

### 4. By member (`by_member`)

One row per user who logged time. Columns: member, email, total_hours, billable_hours, non_billable_hours, billable_amount.

Column keys and labels are SSOT in `export.dto.ts` (`EXPORT_COLUMN_LABELS`, `DEFAULT_EXPORT_COLUMNS`).

## Member export reports

Subset: `time_entries`, `daily_summary`, `by_project` — columns exclude workspace-wide fields (see `MEMBER_*_COLUMNS` in contracts).

## Filters

| Filter | Behavior |
|--------|----------|
| Period | `from` + `to` (ISO datetimes) |
| Project | Optional `projectId` |
| Member | Optional `userId` (admin only) |
| Team only | Optional `teamOnly` — restrict to project team members when project selected |
| Billable | `all` \| `billable` \| `non_billable` |

Workspace is always the session workspace (`X-Workspace-Id`).

## Column picker

Optional `columns` map: per report type, ordered list of column keys. Omitted → defaults. Invalid key → 400.

## Formats

| Format | Delivery |
|--------|----------|
| CSV | One file per report; multiple reports → ZIP |
| Excel (`xlsx`) | One workbook, one sheet per report |
| PDF | Summary layout (totals + capped detail) |

## Rate and amounts

Billable amounts use the same rate resolution as [billing.md](./billing.md) and [reporting.md](./reporting.md).

## Given / When / Then

**When** ADMIN POSTs `/export` with valid body  
**Then** binary stream with `Content-Disposition` attachment and sanitized filename.

**When** MEMBER POSTs `/export/me`  
**Then** only their time logs are included.

**When** date range has no logs  
**Then** empty file or headers-only export (not an error).

## UI

- Admin: [apps/admin/src/app/(admin)/exports/page.tsx](../../apps/admin/src/app/(admin)/exports/page.tsx)
- Client: timesheet export actions on [apps/client/src/app/(workspace)/timesheet/page.tsx](../../apps/client/src/app/(workspace)/timesheet/page.tsx)

## Testing

- API: export totals match reporting dashboard for same filters (`time-aggregation.export.spec.ts`, `reporting.service.spec.ts`).
- Column order reflected in CSV header row; invalid column → 400.

## Out of scope

- Cross-workspace export
- Scheduled / email exports — [FUTURE_SCOPE.md](../architecture/FUTURE_SCOPE.md)
- Multi-currency beyond USD label
