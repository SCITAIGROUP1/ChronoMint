"use client";

import {
  DEFAULT_MEMBER_EXPORT_COLUMNS,
  ROUTES,
  buildExportFilename,
  type MemberExportBodyDto
} from "@kloqra/contracts";
import {
  AppModal,
  Button,
  DateRangePicker,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import {
  isClientCommercialFeaturesEnabled as isCommercialFeaturesEnabled,
  toDateInputValue,
  useDisplayPreferences,
  useProjectsListQuery
} from "@kloqra/web-shared";
import { useEffect, useState } from "react";
import { apiDownloadPost, saveDownloadResponse } from "@/lib/download";
import { useSessionStore } from "@/stores/session.store";

const COMMERCIAL_COLUMNS = new Set(["rate", "amount", "billable_amount"]);

export function TimeTrackerExportModal({
  open,
  onOpenChange,
  defaultFrom,
  defaultTo,
  defaultProjectId = ""
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFrom?: string;
  defaultTo?: string;
  defaultProjectId?: string;
}) {
  const workspaceId = useSessionStore((state) => state.session?.workspaceId ?? "");
  const { timezone, weekStart } = useDisplayPreferences();
  const [from, setFrom] = useState(defaultFrom ?? fallbackFrom());
  const [to, setTo] = useState(defaultTo ?? toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [format, setFormat] = useState<MemberExportBodyDto["format"]>("csv");
  const [billable, setBillable] = useState<MemberExportBodyDto["billable"]>("all");
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { data: projects = [] } = useProjectsListQuery(workspaceId, Boolean(workspaceId && open));

  useEffect(() => {
    if (!open) return;
    setFrom(defaultFrom ?? fallbackFrom());
    setTo(defaultTo ?? toDateInputValue(new Date()));
    setProjectId(defaultProjectId === "all" ? "" : defaultProjectId);
    setError(null);
  }, [open, defaultFrom, defaultTo, defaultProjectId]);

  async function runExport() {
    setExporting(true);
    setError(null);
    try {
      const columns = DEFAULT_MEMBER_EXPORT_COLUMNS.time_entries.filter(
        (column) => isCommercialFeaturesEnabled() || !COMMERCIAL_COLUMNS.has(column)
      );
      const body: MemberExportBodyDto = {
        from: new Date(from).toISOString(),
        to: new Date(`${to}T23:59:59`).toISOString(),
        billable,
        reportTypes: ["time_entries"],
        format,
        columns: { time_entries: columns },
        timezone,
        ...(projectId ? { projectId } : {})
      };
      const response = await apiDownloadPost(ROUTES.EXPORT.ME, workspaceId, body);
      await saveDownloadResponse(
        response,
        buildExportFilename({
          workspaceSlug: "workspace",
          from: body.from,
          to: body.to,
          scope: "member",
          reportSlug: "time-entries",
          ext: format === "xlsx" ? "xlsx" : format
        })
      );
      onOpenChange(false);
    } catch {
      setError("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Export my time"
      description="Download only your time entries."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void runExport()} disabled={exporting}>
            {exporting ? "Exporting…" : "Download"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Label>Date range</Label>
        <DateRangePicker
          from={from}
          to={to}
          onChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
          }}
          weekStartsOn={weekStart === "sunday" ? 0 : 1}
          ariaLabel="Export date range"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            value={projectId || "__all__"}
            onValueChange={(v) => setProjectId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger aria-label="Export project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={billable}
            onValueChange={(v) => setBillable(v as MemberExportBodyDto["billable"])}
          >
            <SelectTrigger aria-label="Export billability">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entries</SelectItem>
              <SelectItem value="billable">Billable</SelectItem>
              <SelectItem value="non_billable">Non-billable</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as MemberExportBodyDto["format"])}
          >
            <SelectTrigger aria-label="Export format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </AppModal>
  );
}

function fallbackFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toDateInputValue(date);
}
