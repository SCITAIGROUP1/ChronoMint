# Admin: Exports

Download workspace time data for payroll, clients, or analysis.

## Open the export wizard

1. Go to **Exports** (`/exports`).
2. Or use **Export** on the dashboard (7 / 30 / 90 day range) and **Customize…** to open the wizard with the same period.

## Configure the export

1. **Period** — presets include Today, This week, Last 7/30/90 days, This month, or custom dates.
2. **Filters** (optional): project, member, billable, team-only (when a project is selected).
3. **Presets** — save locally or to the workspace; click a preset name to load settings.
4. **Reports** — time entries, invoice (billable), daily/weekly summary, by project/member/task, users without time, budget vs actual, utilization.
5. **Columns** — per report: checkboxes, drag reorder, reset to defaults.
6. **Format** — CSV, Excel, or PDF (footer note from workspace settings when configured).

A preview line under the reports shows approximate row counts before you download.

## Download and share

1. Click **Export** for a file download (CSV, ZIP, Excel, or PDF per spec).
2. Click **Create share link** for a 30-day public read-only JSON view (copy URL to share).

## Scheduled exports

In **Scheduled exports**, name a schedule, pick daily/weekly/monthly frequency, add recipient emails, and create from current wizard settings. The server runs exports on schedule (logged until email delivery is configured).

## Tips

- Match the dashboard date range when reconciling totals.
- Use **Invoice** for client-facing billable detail; **Time entries** for payroll tools.
- Empty ranges show a preview warning; some reports (e.g. users without time) can still have rows.

## Related

- [export.md](../../specs/export.md)
