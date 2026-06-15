## Summary

MVP epic for member hours export — wire client UI; exclude invoice/revenue.

## Feature

| Domain | F-12 — Export (hours only) |
| MVP | In scope |

## Shipped evidence

- API: `apps/api/src/modules/export` — `POST /export/me`
- Admin: `apps/admin/src/features/exports/`
- Client component exists: `apps/client/src/components/timesheet-export.tsx` (unwired)
- Spec: `docs/specs/export.md`

## Gap stories

- Wire TimesheetExport on `/timesheet`
- Deprecate legacy `GET /export` (backlog)

## Out of MVP

Invoice wizard, revenue columns, billing — `mvp:out-of-scope`

<SYNC_BLOCK status="TODO" task_id="GH-EPIC-F12" lane="backlog" />
