"use client";

import {
  ROUTES,
  buildExportFilename,
  DEFAULT_MEMBER_EXPORT_COLUMNS,
  type MemberExportBodyDto
} from "@kloqra/contracts";
import {
  AppModal,
  Button,
  DateRangePicker,
  Label,
  ProjectColorDot,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  formatDateRangeLabel
} from "@kloqra/ui";
import { toDateInputValue, useDisplayPreferences, useProjectsListQuery } from "@kloqra/web-shared";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { apiDownloadPost, saveDownloadResponse } from "@/lib/download";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type TimeTrackerExportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug?: string;
  defaultFrom?: string;
  defaultTo?: string;
  defaultProjectId?: string;
};

export function TimeTrackerExportModal({
  open,
  onOpenChange,
  workspaceSlug = "workspace",
  defaultFrom,
  defaultTo,
  defaultProjectId = ""
}: TimeTrackerExportModalProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { timezone, weekStart } = useDisplayPreferences();
  const [from, setFrom] = useState(() => defaultFrom ?? fallbackFrom());
  const [to, setTo] = useState(() => defaultTo ?? toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [format, setFormat] = useState<MemberExportBodyDto["format"]>("csv");
  const [billable, setBillable] = useState<MemberExportBodyDto["billable"]>("all");
  const [pickingRange, setPickingRange] = useState(false);
  const { data: projects = [] } = useProjectsListQuery(ws, Boolean(ws) && open);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFrom(defaultFrom ?? fallbackFrom());
    setTo(defaultTo ?? toDateInputValue(new Date()));
    setProjectId(defaultProjectId === "all" ? "" : defaultProjectId);
    setPickingRange(false);
    setError(null);
  }, [open, defaultFrom, defaultTo, defaultProjectId]);

  async function runExport() {
    setError(null);
    setExporting(true);
    try {
      const body: MemberExportBodyDto = {
        from: new Date(from).toISOString(),
        to: new Date(`${to}T23:59:59`).toISOString(),
        billable,
        reportTypes: ["time_entries"],
        format,
        columns: { time_entries: [...DEFAULT_MEMBER_EXPORT_COLUMNS.time_entries] },
        ...(timezone ? { timezone } : {}),
        ...(projectId ? { projectId } : {})
      };
      const res = await apiDownloadPost(ROUTES.EXPORT.ME, ws, body);
      const fallback = buildExportFilename({
        workspaceSlug,
        from: body.from,
        to: body.to,
        scope: "member",
        reportSlug: "time-entries",
        ext: format === "xlsx" ? "xlsx" : format
      });
      await saveDownloadResponse(res, fallback);
      onOpenChange(false);
    } catch {
      setError("Export failed. Check the date range and try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Export my time"
      description="Download your time entries for payroll or your records."
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void runExport()}
            disabled={exporting || pickingRange}
          >
            {exporting ? "Exporting…" : "Download"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Date range</Label>
          {pickingRange ? (
            <DateRangePicker
              inline
              from={from}
              to={to}
              onChange={(nextFrom, nextTo) => {
                setFrom(nextFrom);
                setTo(nextTo);
                setPickingRange(false);
              }}
              weekStartsOn={weekStart === "sunday" ? 0 : 1}
              ariaLabel="Export date range"
              numberOfMonths={2}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full justify-start gap-2 px-3 font-normal shadow-sm"
              aria-label="Export date range"
              onClick={() => setPickingRange(true)}
            >
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">
                {from && to ? formatDateRangeLabel(from, to) : "Select dates"}
              </span>
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
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

          <div className="space-y-1.5">
            <Label>Billable</Label>
            <Select
              value={billable}
              onValueChange={(v) => setBillable(v as MemberExportBodyDto["billable"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="billable">Billable</SelectItem>
                <SelectItem value="non_billable">Non-billable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as MemberExportBodyDto["format"])}
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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </AppModal>
  );
}

function fallbackFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toDateInputValue(d);
}
