"use client";

import { ROUTES, type TimelogImportResponseDto } from "@kloqra/contracts";
import { AppModal, Button } from "@kloqra/ui";
import { useDisplayPreferences } from "@kloqra/web-shared";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { apiDownloadGet, saveDownloadResponse } from "@/lib/download";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type TimeTrackerImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

export function TimeTrackerImportModal({
  open,
  onOpenChange,
  onImported
}: TimeTrackerImportModalProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { timezone } = useDisplayPreferences();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<TimelogImportResponseDto | null>(null);

  function close() {
    onOpenChange(false);
    setSelectedFile(null);
    setResult(null);
  }

  async function handleDownloadTemplate() {
    try {
      const res = await apiDownloadGet(ROUTES.TIMELOGS.IMPORT_TEMPLATE, ws);
      await saveDownloadResponse(res, "timelog_import_template.xlsx");
      toast.success("Template downloaded.");
    } catch {
      toast.error("Failed to download template.");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", selectedFile);
    if (timezone) formData.append("timezone", timezone);

    try {
      const res = await api<TimelogImportResponseDto>(ROUTES.TIMELOGS.IMPORT, {
        method: "POST",
        workspaceId: ws,
        body: formData
      });
      setResult(res);
      notifyImportResult(res);
      if (res.created > 0) onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import time entries.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
      title="Import time entries"
      description="New rows are created. Entries you already have are skipped automatically."
      icon={<Upload className="size-5" />}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result ? (
            <Button type="submit" form="tt-import-form" disabled={uploading || !selectedFile}>
              {uploading ? "Importing…" : "Import entries"}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">1. Get the template</h4>
            <p className="text-xs text-muted-foreground">
              Download the template, or upload a member export as-is (Category, Hours, Source, and
              Total are kept in the export — import just ignores them).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => void handleDownloadTemplate()}
          >
            <Download className="size-3.5" />
            Template
          </Button>
        </div>

        <form id="tt-import-form" onSubmit={(e) => void handleUpload(e)} className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">2. Upload completed file</h4>
            <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 transition-colors hover:bg-accent/5">
              <input
                type="file"
                accept=".xlsx,.csv"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSelectedFile(e.target.files[0]);
                    setResult(null);
                  }
                }}
              />
              <FileSpreadsheet className="mb-2 size-10 text-muted-foreground" />
              <p className="text-center text-sm font-medium">
                {selectedFile ? selectedFile.name : "Click or drag CSV / Excel here"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                .xlsx or .csv up to 2MB · max 500 rows
              </p>
            </div>
          </div>
        </form>

        {result ? <ImportResultSummary result={result} /> : null}
      </div>
    </AppModal>
  );
}

export function notifyImportResult(res: TimelogImportResponseDto) {
  if (res.created === 0 && res.skipped > 0 && res.failed.length === 0) {
    toast.success(
      res.skipped === 1
        ? "That entry already exists — nothing new to import."
        : `All ${res.skipped} entries already exist — nothing new to import.`
    );
    return;
  }
  if (res.created > 0 || res.skipped > 0) {
    const parts = [
      res.created > 0 ? `Imported ${res.created}` : null,
      res.skipped > 0 ? `skipped ${res.skipped} already in your timesheet` : null,
      res.failed.length > 0 ? `${res.failed.length} failed` : null
    ].filter(Boolean);
    toast.success(parts.join(" · ") + ".");
    return;
  }
  if (res.failed.length > 0) {
    toast.error("No entries imported. Check the failed rows below.");
  }
}

export function ImportResultSummary({ result }: { result: TimelogImportResponseDto }) {
  const allExisting = result.created === 0 && result.skipped > 0 && result.failed.length === 0;

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      {allExisting ? (
        <p className="text-muted-foreground">
          All <strong className="text-foreground">{result.skipped}</strong>{" "}
          {result.skipped === 1 ? "entry was" : "entries were"} already in your timesheet — nothing
          was changed.
        </p>
      ) : (
        <p>
          Created <strong>{result.created}</strong>
          {result.skipped > 0 ? (
            <>
              {" "}
              · Already present <strong>{result.skipped}</strong>
            </>
          ) : null}
          {result.failed.length > 0 ? (
            <>
              {" "}
              · Failed <strong>{result.failed.length}</strong>
            </>
          ) : null}
        </p>
      )}
      {result.failed.length > 0 ? (
        <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
          {result.failed.slice(0, 20).map((f) => (
            <li key={`${f.row}-${f.reason}`}>
              Row {f.row}: {f.reason}
            </li>
          ))}
          {result.failed.length > 20 ? <li>…and {result.failed.length - 20} more</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
