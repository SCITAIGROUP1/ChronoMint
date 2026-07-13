# Timelog import (member)

## User-visible outcome

Members download a CSV/Excel template and upload time entries from **Time Tracker**. Import is **create-only** (never updates existing rows). Each row uses the same lock, overlap, and access rules as manual entry create.

## API

| Method | Route                       | Roles         | Notes                                                   |
| ------ | --------------------------- | ------------- | ------------------------------------------------------- |
| GET    | `/timelogs/import/template` | MEMBER, ADMIN | `.xlsx` template                                        |
| POST   | `/timelogs/import`          | MEMBER, ADMIN | multipart `file` (+ optional `timezone`); sync response |

Contracts: `TIMELOG_IMPORT_COLUMNS`, `timelogImportResponseSchema` in `packages/contracts`.

## Columns

`project`, `task`, `date` (YYYY-MM-DD), `start_time` / `end_time` (HH:mm), optional `description`, `billable`.

Resolve `project` / `task` by name (case-insensitive) or UUID within the caller’s accessible projects/tasks. Times are interpreted in the request `timezone`, else user preference, else workspace timezone.

## Limits

- Max **500** rows per upload
- File size **2MB**
- Formats: `.xlsx`, `.csv`
- Partial success: valid rows create; failures returned as `{ row, reason }`

## UI

Time Tracker AppBar: **Export** (`POST /export/me`) and **Import** (this API). Add Entry stays on the filters toolbar.
