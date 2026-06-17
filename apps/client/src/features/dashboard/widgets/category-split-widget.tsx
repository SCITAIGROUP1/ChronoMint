"use client";

import type { TaskDto, TimeLogDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import React, { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from "recharts";
import { buildCategorySplitData } from "./category-split-data";

export type CategorySplitWidgetProps = {
  logs: TimeLogDto[];
  tasks: TaskDto[];
  periodLabel: string;
};

export function CategorySplitWidget({ logs, tasks, periodLabel }: CategorySplitWidgetProps) {
  const { chartRows, totalHours } = useMemo(
    () => buildCategorySplitData(logs, tasks),
    [logs, tasks]
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of chartRows) {
      config[row.configKey] = { label: row.categoryName, color: row.fill };
    }
    return config;
  }, [chartRows]);

  if (chartRows.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <p className="text-center text-xs text-muted-foreground">No time logged in this period</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[200px] min-w-0 flex-col justify-center">
      <div className="relative min-h-[140px] w-full flex-1">
        <ChartContainer config={chartConfig} className="h-full min-h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartRows}
                dataKey="value"
                nameKey="name"
                innerRadius="65%"
                outerRadius="90%"
                strokeWidth={2}
                paddingAngle={1}
              >
                {chartRows.map((entry) => (
                  <Cell key={entry.configKey} fill={entry.fill} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-3 text-center">
          <p className="text-xl font-bold tracking-tight">{totalHours}h</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {periodLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CategorySplitWidget;
