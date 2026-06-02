"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from "recharts";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ProjectColorDot,
  ProjectNameWithColor,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@chronomint/ui/chart";
import { ROUTES } from "@chronomint/contracts";
import type { DashboardReportDto, ProjectDto, TeamDto } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const billableChartConfig = {
  billableHours: { label: "Billable", color: "var(--chart-1)" },
  nonBillableHours: { label: "Non-billable", color: "var(--chart-3)" }
} satisfies ChartConfig;

const revenueChartConfig = {
  billableAmount: { label: "Revenue ($)", color: "var(--chart-2)" }
} satisfies ChartConfig;

type RangeDays = 7 | 30 | 90;

function rangeQuery(days: RangeDays, filters?: { projectId?: string; userId?: string }) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.userId) params.set("userId", filters.userId);
  return params;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [range, setRange] = useState<RangeDays>(7);
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamDto["members"]>([]);
  const [report, setReport] = useState<DashboardReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedMember = teamMembers.find((m) => m.userId === userId);

  const pageTitle = selectedMember
    ? `${selectedMember.userName} · ${selectedProject!.name}`
    : selectedProject
      ? selectedProject.name
      : "Workspace";

  useEffect(() => {
    if (!ws) return;
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [ws]);

  useEffect(() => {
    if (!ws || !projectId) {
      setTeamMembers([]);
      setUserId("");
      return;
    }
    api<TeamDto>(ROUTES.PROJECTS.TEAM(projectId), { workspaceId: ws })
      .then((team) => setTeamMembers(team.members))
      .catch(() => setTeamMembers([]));
  }, [ws, projectId]);

  useEffect(() => {
    if (!userId) return;
    if (!teamMembers.some((m) => m.userId === userId)) {
      setUserId("");
    }
  }, [teamMembers, userId]);

  function onProjectChange(nextId: string) {
    setProjectId(nextId);
    setUserId("");
  }

  const load = useCallback(() => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    api<DashboardReportDto>(
      `${ROUTES.REPORTING.DASHBOARD}?${rangeQuery(range, {
        projectId: projectId || undefined,
        userId: userId || undefined
      })}`,
      { workspaceId: ws }
    )
      .then(setReport)
      .catch(() => setError("Could not load analytics. Is the API running on port 3001?"))
      .finally(() => setLoading(false));
  }, [ws, range, projectId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-muted-foreground">Loading analytics...</p>;
  }

  if (error || !report) {
    return <p className="text-destructive">{error ?? "No report data"}</p>;
  }

  const pieData = [
    { name: "Billable", key: "billableHours", value: report.workspace.billableHours },
    { name: "Non-billable", key: "nonBillableHours", value: report.workspace.nonBillableHours }
  ].filter((d) => d.value > 0);

  const pieColors = ["var(--color-billableHours)", "var(--color-nonBillableHours)"];

  const colorByProjectId = Object.fromEntries(projects.map((p) => [p.id, p.color]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{pageTitle} analytics</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(report.period.from)} – {formatDate(report.period.to)}
            {selectedProject?.clientName && !selectedMember
              ? ` · ${selectedProject.clientName}`
              : ""}
            {selectedMember ? ` · ${selectedMember.userEmail}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] space-y-1.5">
            <Label className="text-xs text-muted-foreground">Project</Label>
            <Select
              value={projectId || "__all__"}
              onValueChange={(v) => onProjectChange(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <ProjectColorDot color={p.color} />
                      {p.name}
                      {p.clientName ? ` (${p.clientName})` : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] space-y-1.5">
            <Label className="text-xs text-muted-foreground">Team member</Label>
            {projectId ? (
              <Select
                value={userId || "__all__"}
                onValueChange={(v) => setUserId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All team members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All team members</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="flex h-9 items-center text-xs text-muted-foreground">
                Select a project first
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {([7, 30, 90] as const).map((d) => (
              <Button
                key={d}
                size="sm"
                variant={range === d ? "default" : "outline"}
                onClick={() => setRange(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total hours" value={`${report.workspace.totalHours}h`} />
        <SummaryCard label="Billable" value={`${report.workspace.billableHours}h`} />
        <SummaryCard label="Non-billable" value={`${report.workspace.nonBillableHours}h`} />
        <SummaryCard label="Billable %" value={`${report.workspace.billablePercent}%`} />
        <SummaryCard label="Revenue" value={`$${report.workspace.totalAmount}`} />
        <SummaryCard
          label="Active"
          value={`${report.workspace.activeMembers} members · ${report.workspace.activeProjects} projects`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Billable vs non-billable
              {!selectedProject && !selectedMember ? " (workspace)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyHint />
            ) : (
              <ChartContainer config={billableChartConfig} className="mx-auto min-h-[260px] w-full max-w-md">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={entry.key} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily hours trend</CardTitle>
          </CardHeader>
          <CardContent>
            {report.dailyHours.length === 0 ? (
              <EmptyHint />
            ) : (
              <ChartContainer config={billableChartConfig} className="min-h-[260px] w-full">
                <LineChart data={report.dailyHours} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v) => formatDate(`${v}T12:00:00Z`)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="billableHours"
                    stroke="var(--color-billableHours)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="nonBillableHours"
                    stroke="var(--color-nonBillableHours)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hours by project (billable vs non-billable)</CardTitle>
        </CardHeader>
        <CardContent>
          {report.timeByProject.length === 0 ? (
            <EmptyHint />
          ) : (
            <ChartContainer config={billableChartConfig} className="min-h-[300px] w-full">
              <BarChart data={report.timeByProject} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="projectName"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="billableHours"
                  stackId="a"
                  fill="var(--color-billableHours)"
                  radius={[0, 0, 0, 0]}
                />
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

      <Card>
        <CardHeader>
          <CardTitle>Hours by member (billable vs non-billable)</CardTitle>
        </CardHeader>
        <CardContent>
          {report.timeByUser.length === 0 ? (
            <EmptyHint />
          ) : (
            <ChartContainer config={billableChartConfig} className="min-h-[300px] w-full">
              <BarChart data={report.timeByUser} accessibilityLayer>
                <CartesianGrid vertical={false} />
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {report.weeklyHours.length === 0 ? (
              <EmptyHint />
            ) : (
              <ChartContainer config={billableChartConfig} className="min-h-[260px] w-full">
                <BarChart data={report.weeklyHours} accessibilityLayer>
                  <CartesianGrid vertical={false} />
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
            <CardTitle>Revenue by project</CardTitle>
          </CardHeader>
          <CardContent>
            {report.timeByProject.length === 0 ? (
              <EmptyHint />
            ) : (
              <ChartContainer config={revenueChartConfig} className="min-h-[260px] w-full">
                <BarChart data={report.timeByProject} accessibilityLayer>
                  <CartesianGrid vertical={false} />
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
                        fill={colorByProjectId[entry.projectId] ?? "var(--color-billableAmount)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownTable
          title="Project breakdown"
          rows={report.timeByProject.map((p) => ({
            id: p.projectId,
            name: p.projectName,
            color: colorByProjectId[p.projectId],
            ...p
          }))}
        />
        <BreakdownTable
          title="Member breakdown"
          rows={report.timeByUser.map((u) => ({
            id: u.userId,
            name: u.userName,
            totalHours: u.totalHours,
            billableHours: u.billableHours,
            nonBillableHours: u.nonBillableHours,
            billableAmount: u.billableAmount
          }))}
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyHint() {
  return (
    <p className="text-sm text-muted-foreground">
      No time logged in this period. Use the client app or run{" "}
      <code className="rounded bg-muted px-1">pnpm prisma:seed</code>.
    </p>
  );
}

function BreakdownTable({
  title,
  rows
}: {
  title: string;
  rows: {
    id: string;
    name: string;
    color?: string;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    billableAmount: number;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyHint />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Non-bill.</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.color ? (
                      <ProjectNameWithColor name={r.name} color={r.color} />
                    ) : (
                      r.name
                    )}
                  </TableCell>
                  <TableCell className="text-right">{r.totalHours}h</TableCell>
                  <TableCell className="text-right">{r.billableHours}h</TableCell>
                  <TableCell className="text-right">{r.nonBillableHours}h</TableCell>
                  <TableCell className="text-right">${r.billableAmount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
