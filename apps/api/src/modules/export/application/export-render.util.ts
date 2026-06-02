export function projectRows(
  rows: Record<string, string | number>[],
  columnKeys: string[],
  labels: Record<string, string>
): { headers: string[]; lines: string[][] } {
  const headers = columnKeys.map((k) => labels[k] ?? k);
  const lines = rows.map((row) =>
    columnKeys.map((k) => {
      const v = row[k];
      return v === undefined || v === null ? "" : String(v);
    })
  );
  return { headers, lines };
}

export function rowsToCsv(headers: string[], lines: string[][]): string {
  const escape = (cell: string) => {
    if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };
  return [headers.map(escape).join(","), ...lines.map((r) => r.map(escape).join(","))].join(
    "\n"
  );
}
