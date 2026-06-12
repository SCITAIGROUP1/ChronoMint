"use client";

import type { ProjectSummaryDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  buildProjectOverviewCategoryDonutData,
  buildProjectOverviewTaskBarData,
  formatOverviewHours
} from "./project-overview-chart-data";

const taskBarConfig = {
  billableHours: { label: "Billable", color: "hsl(142 76% 36%)" },
  nonBillableHours: { label: "Non-billable", color: "hsl(215 16% 72%)" }
} satisfies ChartConfig;

type ProjectOverviewTaskBarChartProps = {
  rows: ProjectSummaryDto["byTask"];
};

export function ProjectOverviewTaskBarChart({ rows }: ProjectOverviewTaskBarChartProps) {
  const chartData = useMemo(() => buildProjectOverviewTaskBarData(rows), [rows]);

  if (chartData.length === 0) {
    return (
      <p className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
        No time logged in this period.
      </p>
    );
  }

  return (
    <div className="min-h-[220px] w-full min-w-0">
      <ChartContainer config={taskBarConfig} className="h-[220px] w-full">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            unit="h"
          />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            width={110}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="billableHours" stackId="hours" fill="var(--color-billableHours)" />
          <Bar
            dataKey="nonBillableHours"
            stackId="hours"
            fill="var(--color-nonBillableHours)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

type ProjectOverviewCategoryDonutChartProps = {
  rows: ProjectSummaryDto["byCategory"];
  totalHours: number;
};

export function ProjectOverviewCategoryDonutChart({
  rows,
  totalHours
}: ProjectOverviewCategoryDonutChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    const data = buildProjectOverviewCategoryDonutData(rows);
    const config: ChartConfig = {};
    for (const row of data) {
      config[row.configKey] = { label: row.name, color: row.fill };
    }
    return { chartData: data, chartConfig: config };
  }, [rows]);

  if (chartData.length === 0) {
    return (
      <p className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
        No time logged in this period.
      </p>
    );
  }

  return (
    <div className="relative flex min-h-[220px] w-full min-w-0 flex-col justify-center">
      <ChartContainer config={chartConfig} className="mx-auto h-[220px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="85%"
            strokeWidth={2}
            paddingAngle={1}
          >
            {chartData.map((entry) => (
              <Cell key={entry.configKey} fill={entry.fill} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 9 }} layout="horizontal" verticalAlign="bottom" />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8 text-center">
        <p className="text-xl font-bold tracking-tight">{formatOverviewHours(totalHours)}</p>
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
      </div>
    </div>
  );
}
