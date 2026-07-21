"use client";

import { ROUTES, type TimelogImportResponseDto } from "@kloqra/contracts";
import { AppModal, Button } from "@kloqra/ui";
import { useDisplayPreferences } from "@kloqra/web-shared";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { apiDownloadGet, saveDownloadResponse } from "@/lib/download";
import { useSessionStore } from "@/stores/session.store";

export function TimeTrackerImportModal({
  open,
  onOpenChange,
  onImported
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}) {
  const workspaceId = useSessionStore((state) => state.session?.workspaceId ?? "");
  const { timezone } = useDisplayPreferences();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<TimelogImportResponseDto | null>(null);
  const close = () => {
    onOpenChange(false);
    setFile(null);
    setResult(null);
  };

  async function downloadTemplate() {
    try {
      await saveDownloadResponse(
        await apiDownloadGet(ROUTES.TIMELOGS.IMPORT_TEMPLATE, workspaceId),
        "timelog_import_template.xlsx"
      );
    } catch {
      toast.error("Failed to download template.");
    }
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("timezone", timezone);
    try {
      const response = await api<TimelogImportResponseDto>(ROUTES.TIMELOGS.IMPORT, {
        method: "POST",
        workspaceId,
        body: formData
      });
      setResult(response);
      notifyImportResult(response);
      if (response.created > 0) onImported?.();
    } catch {
      toast.error("Failed to import time entries.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Import time entries"
      description="New rows are created and entries you already have are skipped."
      icon={<Upload className="size-5" />}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result ? (
            <Button type="submit" form="time-import" disabled={!file || uploading}>
              {uploading ? "Importing…" : "Import entries"}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">1. Get the template</p>
            <p className="text-xs text-muted-foreground">
              CSV and Excel files support up to 500 rows.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void downloadTemplate()}>
            <Download className="size-4" /> Template
          </Button>
        </div>
        <form id="time-import" onSubmit={(event) => void upload(event)}>
          <label className="relative flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed p-6">
            <input
              type="file"
              accept=".xlsx,.csv"
              className="absolute inset-0 opacity-0"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <FileSpreadsheet className="mb-2 size-10 text-muted-foreground" />
            <span className="text-sm font-medium">
              {file?.name ?? "Click or drag CSV / Excel here"}
            </span>
          </label>
        </form>
        {result ? (
          <p className="rounded-lg border p-3 text-sm">
            Created <strong>{result.created}</strong> · Already present{" "}
            <strong>{result.skipped}</strong>
            {result.failed.length ? (
              <>
                {" "}
                · Failed <strong>{result.failed.length}</strong>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </AppModal>
  );
}

export function notifyImportResult(result: TimelogImportResponseDto) {
  if (result.created === 0 && result.skipped > 0 && result.failed.length === 0) {
    toast.success(
      result.skipped === 1
        ? "That entry already exists — nothing new to import."
        : `All ${result.skipped} entries already exist — nothing new to import.`
    );
  } else if (result.created > 0 || result.skipped > 0) {
    toast.success(
      [
        result.created ? `Imported ${result.created}` : null,
        result.skipped ? `skipped ${result.skipped} already in your timesheet` : null,
        result.failed.length ? `${result.failed.length} failed` : null
      ]
        .filter(Boolean)
        .join(" · ") + "."
    );
  } else {
    toast.error("No entries imported. Check the failed rows.");
  }
}
