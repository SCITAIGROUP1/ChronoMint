import type { TaskDto, TimeLogDto } from "@kloqra/contracts";

export const CATEGORY_SPLIT_PALETTE = [
  "hsl(221 83% 53%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 58%)",
  "hsl(0 84% 60%)",
  "hsl(187 85% 43%)",
  "hsl(215 16% 55%)"
] as const;

export type CategorySplitRow = {
  id: string;
  categoryName: string;
  hours: number;
  percentage: number;
  color: string;
};

export type CategorySplitChartRow = CategorySplitRow & {
  name: string;
  value: number;
  fill: string;
  configKey: string;
};

export type CategorySplitData = {
  rows: CategorySplitRow[];
  chartRows: CategorySplitChartRow[];
  totalHours: number;
};

function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

export function buildCategorySplitData(logs: TimeLogDto[], tasks: TaskDto[]): CategorySplitData {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const categoryHoursMap: Record<string, { id: string; name: string; hours: number }> = {};

  for (const log of logs) {
    const task = taskById.get(log.taskId);
    const categoryId = task?.categoryId ?? "unknown";
    const categoryName = task?.categoryName ?? "Uncategorized";
    const hours = log.durationSec / 3600;
    const existing = categoryHoursMap[categoryId];

    if (existing) {
      existing.hours += hours;
    } else {
      categoryHoursMap[categoryId] = { id: categoryId, name: categoryName, hours };
    }
  }

  const rawTotal = Object.values(categoryHoursMap).reduce((sum, row) => sum + row.hours, 0);
  const totalHours = roundHours(rawTotal);

  const rows: CategorySplitRow[] = Object.values(categoryHoursMap)
    .map((row) => {
      const roundedHours = roundHours(row.hours);
      const percentage = rawTotal > 0 ? Math.round((row.hours / rawTotal) * 1000) / 10 : 0;

      return {
        id: row.id,
        categoryName: row.name,
        hours: roundedHours,
        percentage,
        color: ""
      };
    })
    .sort((a, b) => b.hours - a.hours)
    .map((row, idx) => ({
      ...row,
      color: CATEGORY_SPLIT_PALETTE[idx % CATEGORY_SPLIT_PALETTE.length]!
    }));

  const chartRows: CategorySplitChartRow[] = rows.map((row, idx) => ({
    ...row,
    name: row.categoryName,
    value: row.hours,
    fill: row.color,
    configKey: `cat_${idx}`
  }));

  return { rows, chartRows, totalHours };
}

export function categorySplitPeriodLabel(range: "today" | "week" | "month" | "custom"): string {
  switch (range) {
    case "today":
      return "Today";
    case "week":
      return "This week";
    case "month":
      return "This month";
    default:
      return "Period";
  }
}
