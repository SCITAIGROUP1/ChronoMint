"use client";

import type { DashboardReportDto } from "@chronomint/contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@chronomint/ui";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@chronomint/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Legend, XAxis, YAxis } from "recharts";

const billableChartConfig = {
  billableHours: { label: "Billable", color: "hsl(var(--chart-1))" },
  nonBillableHours: { label: "Non-billable", color: "hsl(var(--chart-2))" }
} satisfies ChartConfig;

const revenueChartConfig = {
  billableAmount: { label: "Revenue", color: "hsl(var(--chart-3))" }
} satisfies ChartConfig;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Props = {
  report: DashboardReportDto;
  projectColors: Record<string, string>;
};

export function DashboardExtraCharts({ report, projectColors }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly breakdown</CardTitle>
            <CardDescription>Billable vs non-billable by week</CardDescription>
          </CardHeader>
          <CardContent>
            {report.weeklyHours.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No weekly data</p>
            ) : (
              <ChartContainer config={billableChartConfig} className="min-h-[260px] w-full">
                <BarChart data={report.weeklyHours} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="weekStart"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v) => formatDate(`${v}T12:00:00Z`)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="billableHours" stackId="w" fill="var(--color-billableHours)" />
                  <Bar
                    dataKey="nonBillableHours"
                    stackId="w"
                    fill="var(--color-nonBillableHours)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by project</CardTitle>
            <CardDescription>Billable amount in period</CardDescription>
          </CardHeader>
          <CardContent>
            {report.timeByProject.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No project revenue</p>
            ) : (
              <ChartContainer config={revenueChartConfig} className="min-h-[260px] w-full">
                <BarChart data={report.timeByProject} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="projectName"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="billableAmount" radius={4}>
                    {report.timeByProject.map((entry) => (
                      <Cell
                        key={entry.projectId}
                        fill={projectColors[entry.projectId] ?? "var(--color-billableAmount)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hours by member</CardTitle>
          <CardDescription>Stacked billable and non-billable hours</CardDescription>
        </CardHeader>
        <CardContent>
          {report.timeByUser.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No member data</p>
          ) : (
            <ChartContainer config={billableChartConfig} className="min-h-[300px] w-full">
              <BarChart data={report.timeByUser} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="userName"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="billableHours" stackId="a" fill="var(--color-billableHours)" />
                <Bar
                  dataKey="nonBillableHours"
                  stackId="a"
                  fill="var(--color-nonBillableHours)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
