# Member: Export and import my time

Manage your own time files from **Time Tracker** (`/time-tracker`).

## Export

1. Open **Time Tracker**.
2. Set the period (or custom date range) you want — Export pre-fills that range.
3. Click **Export** in the page header.
4. Optionally filter by **project** or **billable** status, and choose CSV / Excel / PDF.
5. Click **Download**.

Filenames include your workspace slug and a `-my-timesheet` segment.

## Import

1. On **Time Tracker**, click **Import** in the page header.
2. Download the **Template** (headers match export: Project, Task, Date, Start, End, …).
3. Fill rows, **or** upload a member time-entry export — title rows, extra columns, and the Total
   footer are ignored.
4. Upload the `.xlsx` or `.csv` file and click **Import entries**.
5. Review created vs failed rows. Successful entries appear in the list after refresh.

Import only **creates** new entries for you. Rows that already match an existing entry (same task
and start/end) are **skipped**. Locked periods, overlaps with _different_ entries, and unknown
projects/tasks fail that row without undoing the rest.

## What is not included

- Other members’ hours
- Overwriting existing entries by id
- Admin workspace-wide bulk import

## Related

- [Timer and timesheet](timer-and-timesheet.md)
- Spec: [timelog-import.md](../../specs/timelog-import.md)
