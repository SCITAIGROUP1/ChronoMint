# Export spec

## User-visible outcome

- **Admins** run a multi-report export wizard: filters, report types, per-report columns, CSV / Excel / PDF, row preview, presets (local + server), scheduled exports, shareable links.
- **Admins** quick-export from the dashboard (same date range as analytics chips).
- **Members** export their own timesheet from the client app (`POST /export/me`).
- **Public** read-only report views via share token (`GET /export/share/:token`).

Exports query **TimeLog** rows in the active workspace (not `TeamMember` directly). “Team member” in filters means **filter by user**, optionally limited to a project’s team.

Domain note: [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md).

## API

| Method | Route                   | Roles         | Contract                                                  |
| ------ | ----------------------- | ------------- | --------------------------------------------------------- |
| POST   | `/export`               | ADMIN         | `exportBodySchema`                                        |
| POST   | `/export/preview`       | ADMIN         | `exportPreviewBodySchema` → `exportPreviewResponseSchema` |
| GET    | `/export`               | ADMIN         | `exportQuerySchema` (legacy; default columns)             |
| POST   | `/export/me`            | ADMIN, MEMBER | `memberExportBodySchema`                                  |
| GET    | `/export/presets`       | ADMIN         | —                                                         |
| POST   | `/export/presets`       | ADMIN         | `createExportPresetSchema`                                |
| DELETE | `/export/presets/:id`   | ADMIN         | —                                                         |
| GET    | `/export/schedules`     | ADMIN         | —                                                         |
| POST   | `/export/schedules`     | ADMIN         | `createExportScheduleSchema`                              |
| PATCH  | `/export/schedules/:id` | ADMIN         | `updateExportScheduleSchema`                              |
| DELETE | `/export/schedules/:id` | ADMIN         | —                                                         |
| POST   | `/export/shares`        | ADMIN         | `createReportShareSchema`                                 |
| GET    | `/export/share/:token`  | Public        | `publicReportShareViewSchema`                             |

Controller: [export.controller.ts](../../apps/api/src/modules/export/interface/http/export.controller.ts), [export-share.controller.ts](../../apps/api/src/modules/export/interface/http/export-share.controller.ts)

Aggregation: [export.service.ts](../../apps/api/src/modules/export/application/export.service.ts), [export-rows.builder.ts](../../apps/api/src/modules/export/application/export-rows.builder.ts), [time-aggregation.service.ts](../../apps/api/src/modules/reporting/application/time-aggregation.service.ts)

Filenames: [export-filename.ts](../../packages/contracts/src/export-filename.ts)

## Report catalog (admin)

| Type                 | Description                                   |
| -------------------- | --------------------------------------------- |
| `time_entries`       | One row per logged interval                   |
| `invoice`            | Billable entries only + TOTAL row             |
| `daily_summary`      | date × member × project                       |
| `weekly_summary`     | ISO week × member × project                   |
| `by_project`         | One row per project                           |
| `by_member`          | One row per user with logs                    |
| `by_task`            | One row per task                              |
| `users_without_time` | Members with zero logs in range               |
| `budget_vs_actual`   | Project budget vs logged hours                |
| `utilization`        | Member × week vs expected hours (default 40h) |

Column keys and labels: SSOT in `export.dto.ts`.

## Member export reports

Subset: `time_entries`, `daily_summary`, `by_project` — columns exclude workspace-wide fields.

## Filters

| Filter    | Behavior                                  |
| --------- | ----------------------------------------- |
| Period    | `from` + `to` (ISO datetimes)             |
| Project   | Optional `projectId`                      |
| Member    | Optional `userId` (admin only)            |
| Team only | Optional `teamOnly` when project selected |
| Billable  | `all` \| `billable` \| `non_billable`     |

## Workspace settings (export)

Parsed via [workspace-settings.ts](../../packages/contracts/src/workspace-settings.ts):

- `exportFooterNote` — PDF footer text
- `logoUrl` — reserved for future PDF logo embed
- `weekStart` — `monday` \| `sunday` for weekly/utilization buckets
- `expectedWeeklyHours` — utilization denominator (default 40)

## Formats

| Format | Delivery                                  |
| ------ | ----------------------------------------- |
| CSV    | One file per report; multiple → ZIP       |
| Excel  | One workbook, one sheet per report        |
| PDF    | Summary layout; footer note from settings |

## Scheduled exports

`ExportSchedule` stores frozen `exportBodySchema` JSON, frequency (`daily` \| `weekly` \| `monthly`), and recipient emails. A background interval runs due schedules and calls `generate()`; delivery is logged (SMTP integration optional via env).

## Shareable links

`ReportShare` stores filter snapshot + token. Public GET returns JSON view (up to 100 rows per report). Expires per `expiresInDays` (max 90).

## Given / When / Then

**When** ADMIN POSTs `/export/preview`  
**Then** JSON with per-report row counts and `isEmpty`.

**When** ADMIN POSTs `/export` with valid body  
**Then** binary attachment with sanitized filename.

**When** GET `/export/share/:token` and not expired  
**Then** public JSON report view without auth.

## UI

- Admin: [exports/page.tsx](<../../apps/admin/src/app/(admin)/exports/page.tsx>), [dashboard/page.tsx](<../../apps/admin/src/app/(admin)/dashboard/page.tsx>)
- Client: timesheet export on client app

## Testing

- [export-week.util.spec.ts](../../apps/api/src/modules/export/application/export-week.util.spec.ts)
- [export-preview.spec.ts](../../apps/api/src/modules/export/application/export-preview.spec.ts)
- Aggregation parity: `time-aggregation.export.spec.ts`

## Out of scope

- Cross-workspace export
- QuickBooks / Xero sync
- Expense / attendance report types
