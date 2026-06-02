# Admin: Exports

Download workspace time data for payroll, clients, or analysis.

## Open the export wizard

1. Go to **Exports** (`/exports`).

## Configure the export

1. **Period** — set **From** and **To** dates (default often last 30 days).
2. **Filters** (optional):
   - **Project** — limit to one project
   - **Member** — limit to one person
   - **Billable** — all, billable only, or non-billable only
   - **Team only** — when a project is selected, only members on that project’s team
3. **Reports** — select one or more:
   - **Time entries** — every log line (audit / payroll)
   - **Daily summary** — by day, member, and project
   - **By project** — totals per project
   - **By member** — totals per person
4. **Columns** — for each selected report, choose which columns appear and use up/down to reorder. Use **Reset columns** to restore defaults.
5. **Format** — CSV, Excel, or PDF.

## Download

1. Click **Export**.
2. Your browser downloads:
   - **CSV** — one file per report, or a ZIP if multiple reports
   - **Excel** — one workbook with a sheet per report
   - **PDF** — summary-oriented layout

Filenames look like: `chronomint-{workspace}-{from}_to_{to}-{report}.csv`

## Tips

- Match the dashboard date range when reconciling totals.
- Use **Time entries** for accounting tools; use **By project** for client reviews.
- Empty ranges still download but may contain headers only.

## Related

- [export.md](../../specs/export.md)
