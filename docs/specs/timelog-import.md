# Timelog import (member)

## User-visible outcome

Members download a CSV/Excel template and upload time entries from **Time Tracker**. Import
**creates** new rows only. Rows that already exist (same task + start/end minute, same-task
coverage, or any overlap conflict) are **skipped** — never updated or duplicated. Overnight
shifts (`23:00`–`03:30`) roll the end to the next calendar day.

## API

| Method | Route                       | Roles         | Notes                                                   |
| ------ | --------------------------- | ------------- | ------------------------------------------------------- |
| GET    | `/timelogs/import/template` | MEMBER, ADMIN | `.xlsx` template                                        |
| POST   | `/timelogs/import`          | MEMBER, ADMIN | multipart `file` (+ optional `timezone`); sync response |

Contracts: `TIMELOG_IMPORT_COLUMNS`, `timelogImportResponseSchema` in `packages/contracts`.

## Columns

Import accepts either:

- the **import template** (headers on row 1), or
- a **member time-entry export** (title block + same headers + Total footer).

Both use the same core labels: `Project`, `Task`, `Date`, `Start`, `End`, optional `Description`,
`Billable`. Snake_case aliases (`start_time`, …) still work.

**Export keeps its full report layout** (title/subtitle, `Category`, `Hours`, `Source`, Rate/Amount
when commercial features are on, and the Total footer). Import does **not** strip those from the
file — it simply ignores columns it does not need and skips the Total row.

Resolve `project` / `task` by name (case-insensitive) or UUID within the caller’s accessible
projects/tasks. Times are interpreted in the request `timezone`, else user preference, else
workspace timezone.

## Limits

- Max **500** rows per upload
- File size **2MB**
- Formats: `.xlsx`, `.csv`
- Partial success: `{ created, skipped, failed[] }` — existing/overlapping rows count as skipped
  (not errors). Only hard failures (unknown project/task, locked period, invalid times) appear in
  `failed`.

## UI

Time Tracker AppBar: **Export** (`POST /export/me`) and **Import** (this API). Add Entry stays on the filters toolbar.
