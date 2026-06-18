import type { ExportPreviewSampleRowsDto, ExportReportType } from "@kloqra/contracts";
import type { ExportCellValue } from "./export-render.util";

export type ExportSampleSheet = {
  name: string;
  report: ExportReportType;
  headers: string[];
  lines: ExportCellValue[][];
};

/** Build sample rows from the same projected sheet lines used for download. */
export function buildExportPreviewSampleRows(
  sheets: ExportSampleSheet[],
  options?: {
    focusReport?: ExportReportType;
    maxRows?: number;
  }
): ExportPreviewSampleRowsDto[] {
  const maxRows = options?.maxRows ?? 5;
  if (sheets.length === 0) return [];

  const candidates = options?.focusReport
    ? sheets.filter((sheet) => sheet.report === options.focusReport)
    : sheets;

  const sheet = candidates.find((candidate) => candidate.lines.length > 0) ?? candidates[0];
  if (!sheet || sheet.headers.length === 0) return [];

  const rows = sheet.lines.slice(0, maxRows).map((line) => {
    const out: Record<string, string | number> = {};
    sheet.headers.forEach((header, index) => {
      const val = line[index];
      out[header] =
        val === undefined || val === null ? "" : typeof val === "number" ? val : String(val);
    });
    return out;
  });

  if (rows.length === 0) return [];

  return [
    {
      reportType: sheet.report,
      sheetName: sheet.name,
      columns: [...sheet.headers],
      rows
    }
  ];
}
