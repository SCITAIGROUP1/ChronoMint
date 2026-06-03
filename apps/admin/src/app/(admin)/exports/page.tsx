"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  type ExportPresetDto,
  type ExportPreviewResponseDto,
  type ExportReportType,
  type ProjectDto,
  type ReportShareDto,
  type WorkspaceMemberDto
} from "@chronomint/contracts";
import { ExportColumnPicker } from "@/components/export-column-picker";
import { ExportSchedulesPanel } from "@/components/export-schedules-panel";
import { api, apiDownloadPost } from "@/lib/api";
import { applyDatePreset, toDateInputValue, type DatePreset } from "@/lib/export-date-presets";
import {
  deleteLocalExportPreset,
  listLocalExportPresets,
  saveLocalExportPreset,
  type StoredExportPreset
} from "@/lib/export-presets";
import { saveDownloadResponse } from "@/lib/download";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const REPORT_OPTIONS: { id: ExportReportType; label: string }[] = [
  { id: "time_entries", label: "Time entries" },
  { id: "daily_summary", label: "Daily summary" },
  { id: "weekly_summary", label: "Weekly summary" },
  { id: "by_project", label: "By project" },
  { id: "by_member", label: "By member" },
  { id: "by_task", label: "By task" },
  { id: "invoice", label: "Invoice (billable)" },
  { id: "users_without_time", label: "Users without time" },
  { id: "budget_vs_actual", label: "Budget vs actual" },
  { id: "utilization", label: "Utilization" }
];

const PERIOD_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "month", label: "This month" }
];

function defaultColumnsMap(): Record<ExportReportType, string[]> {
  return Object.fromEntries(
    (Object.keys(DEFAULT_EXPORT_COLUMNS) as ExportReportType[]).map((k) => [
      k,
      [...DEFAULT_EXPORT_COLUMNS[k]]
    ])
  ) as Record<ExportReportType, string[]>;
}

export default function ExportsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
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
  const [preview, setPreview] = useState<ExportPreviewResponseDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [localPresets, setLocalPresets] = useState<StoredExportPreset[]>([]);
  const [serverPresets, setServerPresets] = useState<ExportPresetDto[]>([]);
  const [presetName, setPresetName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qFrom = params.get("from");
    const qTo = params.get("to");
    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
  }, []);

  useEffect(() => {
    if (!ws) return;
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).then(setMembers);
    setLocalPresets(listLocalExportPresets(ws));
    api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, { workspaceId: ws })
      .then(setServerPresets)
      .catch(() => {});
  }, [ws]);

  const columnsPayload = useMemo(() => {
    const out: Partial<Record<ExportReportType, string[]>> = {};
    for (const rt of reportTypes) {
      out[rt] = columnsByReport[rt];
    }
    return out;
  }, [reportTypes, columnsByReport]);

  const exportBody = useMemo((): ExportBodyDto => {
    return {
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
  }, [from, to, billable, reportTypes, format, projectId, userId, teamOnly, columnsPayload]);

  const previewBody = useMemo(
    () => ({
      from: exportBody.from,
      to: exportBody.to,
      billable: exportBody.billable,
      reportTypes: exportBody.reportTypes,
      ...(exportBody.projectId ? { projectId: exportBody.projectId } : {}),
      ...(exportBody.userId ? { userId: exportBody.userId } : {}),
      ...(exportBody.teamOnly ? { teamOnly: true } : {})
    }),
    [exportBody]
  );

  useEffect(() => {
    if (!ws) return;
    const t = setTimeout(() => {
      setPreviewLoading(true);
      api<ExportPreviewResponseDto>(ROUTES.EXPORT.PREVIEW, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify(previewBody)
      })
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [ws, previewBody]);

  function toggleReport(rt: ExportReportType) {
    setReportTypes((prev) =>
      prev.includes(rt) ? (prev.length > 1 ? prev.filter((r) => r !== rt) : prev) : [...prev, rt]
    );
  }

  function applyPresetBody(body: ExportBodyDto) {
    setFrom(body.from.slice(0, 10));
    setTo(body.to.slice(0, 10));
    setBillable(body.billable);
    setFormat(body.format);
    setReportTypes(body.reportTypes);
    setProjectId(body.projectId ?? "");
    setUserId(body.userId ?? "");
    setTeamOnly(body.teamOnly ?? false);
    if (body.columns) {
      setColumnsByReport((prev) => {
        const next = { ...prev };
        for (const rt of body.reportTypes) {
          if (body.columns?.[rt]) next[rt] = [...body.columns[rt]!];
        }
        return next;
      });
    }
  }

  const saveLocalPreset = () => {
    if (!ws || !presetName.trim()) return;
    setLocalPresets(saveLocalExportPreset(ws, presetName.trim(), exportBody));
    setPresetName("");
  };

  const saveServerPreset = async () => {
    if (!ws || !presetName.trim()) return;
    try {
      await api(ROUTES.EXPORT.PRESETS, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ name: presetName.trim(), body: exportBody })
      });
      const list = await api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, { workspaceId: ws });
      setServerPresets(list);
      setPresetName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preset");
    }
  };

  async function createShareLink() {
    if (!ws) return;
    setSharing(true);
    setShareUrl(null);
    try {
      const result = await api<ReportShareDto>(ROUTES.EXPORT.SHARES, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          body: previewBody,
          expiresInDays: 30
        })
      });
      setShareUrl(result.shareUrl);
    } catch {
      setError("Could not create share link.");
    } finally {
      setSharing(false);
    }
  }

  async function runExport() {
    setError(null);
    setExporting(true);
    try {
      const res = await apiDownloadPost(ROUTES.EXPORT.GENERATE, ws, exportBody);
      const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
      await saveDownloadResponse(res, `chronomint-export.${ext}`);
    } catch {
      setError("Export failed. Check filters and that the API is running.");
    } finally {
      setExporting(false);
    }
  }

  const previewLine = useCallback(() => {
    if (previewLoading) return "Estimating row counts…";
    if (!preview) return null;
    if (preview.isEmpty) return "No rows match the current filters.";
    const parts = reportTypes.map((rt) => {
      const n = preview.counts[rt];
      if (n === undefined) return null;
      const label = REPORT_OPTIONS.find((o) => o.id === rt)?.label ?? rt;
      return `~${n.toLocaleString()} ${label}`;
    });
    return `${parts.filter(Boolean).join(" · ")} (${preview.totalLogRows.toLocaleString()} time logs)`;
  }, [preview, previewLoading, reportTypes]);

  const canExport = reportTypes.every((rt) => columnsByReport[rt]?.length > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Exports</h2>
      <p className="text-sm text-muted-foreground">
        Download workspace time data. Pick reports, columns, and format — or use{" "}
        <Link href="/dashboard" className="underline">
          dashboard quick export
        </Link>
        .
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Export wizard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-sm text-muted-foreground w-full sm:w-auto">Period</span>
            {PERIOD_PRESETS.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const range = applyDatePreset(id);
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
            <Label>Presets</Label>
            <div className="flex flex-wrap gap-2 items-end">
              <Input
                className="max-w-[200px]"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <Button type="button" size="sm" variant="outline" onClick={saveLocalPreset}>
                Save locally
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={saveServerPreset}>
                Save to workspace
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {serverPresets.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => applyPresetBody(p.body)}
                  >
                    {p.name}
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      await api(ROUTES.EXPORT.PRESET(p.id), { method: "DELETE", workspaceId: ws });
                      const list = await api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, {
                        workspaceId: ws
                      });
                      setServerPresets(list);
                    }}
                    aria-label={`Delete ${p.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {localPresets.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPresetBody(p.body)}
                  >
                    {p.name} (local)
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => ws && setLocalPresets(deleteLocalExportPreset(ws, p.id))}
                    aria-label={`Delete ${p.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

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
                selected={columnsByReport[rt] ?? []}
                onChange={(cols) =>
                  setColumnsByReport((prev) => ({ ...prev, [rt]: cols }))
                }
              />
            ))}
          </div>

          {previewLine() ? (
            <p
              className={`text-sm ${preview?.isEmpty ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
            >
              {previewLine()}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={runExport} disabled={!canExport || exporting}>
              {exporting ? "Exporting…" : "Export"}
            </Button>
            <Button type="button" variant="outline" onClick={createShareLink} disabled={sharing}>
              {sharing ? "Creating link…" : "Create share link"}
            </Button>
          </div>
          {shareUrl ? (
            <p className="text-sm break-all">
              Share link (30 days):{" "}
              <a href={shareUrl} className="underline" target="_blank" rel="noreferrer">
                {shareUrl}
              </a>
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <ExportSchedulesPanel workspaceId={ws} currentBody={exportBody} />
    </div>
  );
}
