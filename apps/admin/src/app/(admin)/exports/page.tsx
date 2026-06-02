"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ProjectColorDot,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@chronomint/ui";
import {
  DEFAULT_EXPORT_COLUMNS,
  ROUTES,
  type ExportBodyDto,
  type ExportReportType,
  type ProjectDto,
  type WorkspaceMemberDto
} from "@chronomint/contracts";
import { ExportColumnPicker } from "@/components/export-column-picker";
import { api, apiDownloadPost } from "@/lib/api";
import { saveDownloadResponse } from "@/lib/download";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const REPORT_OPTIONS: { id: ExportReportType; label: string }[] = [
  { id: "time_entries", label: "Time entries" },
  { id: "daily_summary", label: "Daily summary" },
  { id: "by_project", label: "By project" },
  { id: "by_member", label: "By member" }
];

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultColumnsMap(): Record<ExportReportType, string[]> {
  return {
    time_entries: [...DEFAULT_EXPORT_COLUMNS.time_entries],
    daily_summary: [...DEFAULT_EXPORT_COLUMNS.daily_summary],
    by_project: [...DEFAULT_EXPORT_COLUMNS.by_project],
    by_member: [...DEFAULT_EXPORT_COLUMNS.by_member]
  };
}

type DatePreset = "7d" | "30d" | "90d" | "month";

function applyDatePreset(preset: DatePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (preset === "month") {
    from.setDate(1);
  } else {
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    from.setDate(from.getDate() - days);
  }
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export default function ExportsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [teamOnly, setTeamOnly] = useState(false);
  const [billable, setBillable] = useState<ExportBodyDto["billable"]>("all");
  const [format, setFormat] = useState<ExportBodyDto["format"]>("xlsx");
  const [reportTypes, setReportTypes] = useState<ExportReportType[]>([
    "time_entries",
    "by_project"
  ]);
  const [columnsByReport, setColumnsByReport] = useState(defaultColumnsMap);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!ws) return;
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).then(setMembers);
  }, [ws]);

  const columnsPayload = useMemo(() => {
    const out: Partial<Record<ExportReportType, string[]>> = {};
    for (const rt of reportTypes) {
      out[rt] = columnsByReport[rt];
    }
    return out;
  }, [reportTypes, columnsByReport]);

  function toggleReport(rt: ExportReportType) {
    setReportTypes((prev) =>
      prev.includes(rt) ? (prev.length > 1 ? prev.filter((r) => r !== rt) : prev) : [...prev, rt]
    );
  }

  async function runExport() {
    setError(null);
    setExporting(true);
    try {
      const body: ExportBodyDto = {
        from: new Date(from).toISOString(),
        to: new Date(to + "T23:59:59").toISOString(),
        billable,
        reportTypes,
        format,
        columns: columnsPayload,
        ...(projectId ? { projectId } : {}),
        ...(userId ? { userId } : {}),
        ...(teamOnly && projectId ? { teamOnly: true } : {})
      };

      const res = await apiDownloadPost(ROUTES.EXPORT.GENERATE, ws, body);
      const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
      await saveDownloadResponse(res, `chronomint-export.${ext}`);
    } catch {
      setError("Export failed. Check filters and that the API is running.");
    } finally {
      setExporting(false);
    }
  }

  const canExport = reportTypes.every((rt) => columnsByReport[rt].length > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Exports</h2>
      <p className="text-sm text-muted-foreground">
        Download time data for the active workspace. Pick reports, columns, and format.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Export wizard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-sm text-muted-foreground w-full sm:w-auto">Period</span>
            {(
              [
                ["7d", "Last 7 days"],
                ["30d", "Last 30 days"],
                ["90d", "Last 90 days"],
                ["month", "This month"]
              ] as const
            ).map(([preset, label]) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const range = applyDatePreset(preset);
                  setFrom(range.from);
                  setTo(range.to);
                }}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2 min-w-[180px]">
              <Label>Project</Label>
              <Select
                value={projectId || "__all__"}
                onValueChange={(v) => setProjectId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <ProjectColorDot color={p.color} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[180px]">
              <Label>Member</Label>
              <Select
                value={userId || "__all__"}
                onValueChange={(v) => setUserId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All members</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[140px]">
              <Label>Billable</Label>
              <Select
                value={billable}
                onValueChange={(v) => setBillable(v as ExportBodyDto["billable"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="billable">Billable only</SelectItem>
                  <SelectItem value="non_billable">Non-billable only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[120px]">
              <Label>Format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as ExportBodyDto["format"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {projectId ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={teamOnly}
                onChange={(e) => setTeamOnly(e.target.checked)}
                className="h-4 w-4"
              />
              Only project team members
            </label>
          ) : null}

          <div className="space-y-2">
            <Label>Reports</Label>
            <div className="flex flex-wrap gap-3">
              {REPORT_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reportTypes.includes(opt.id)}
                    onChange={() => toggleReport(opt.id)}
                    className="h-4 w-4"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {reportTypes.map((rt) => (
              <ExportColumnPicker
                key={rt}
                report={rt}
                selected={columnsByReport[rt]}
                onChange={(cols) =>
                  setColumnsByReport((prev) => ({ ...prev, [rt]: cols }))
                }
              />
            ))}
          </div>

          <Button onClick={runExport} disabled={!canExport || exporting}>
            {exporting ? "Exporting…" : "Export"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
