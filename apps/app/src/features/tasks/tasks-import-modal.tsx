"use client";

import { ROUTES, type TaskImportResponseDto } from "@kloqra/contracts";
import { AppModal, Button } from "@kloqra/ui";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { apiDownloadGet, saveDownloadResponse } from "@/lib/download";

export function TasksImportModal({
  open,
  onOpenChange,
  workspaceId,
  onImported
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onImported?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<TaskImportResponseDto | null>(null);

  const close = () => {
    onOpenChange(false);
    setFile(null);
    setResult(null);
  };

  async function downloadTemplate() {
    try {
      await saveDownloadResponse(
        await apiDownloadGet(ROUTES.TASKS.BULK_TEMPLATE, workspaceId),
        "tasks_template.xlsx"
      );
      toast.success("Template downloaded.");
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
    try {
      const response = await api<TaskImportResponseDto>(ROUTES.TASKS.BULK_UPLOAD, {
        method: "POST",
        workspaceId,
        body: formData
      });
      setResult(response);
      notifyTaskImportResult(response);
      if (response.created > 0) onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import tasks.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Import tasks"
      description="Download the template, pick projects and categories from the dropdowns, then upload. All imported tasks are common."
      icon={<Upload className="size-5" />}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result ? (
            <Button type="submit" form="tasks-import-form" disabled={!file || uploading}>
              {uploading ? "Importing…" : "Import tasks"}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        {!result ? (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">1. Get the template</h4>
              <Button type="button" variant="outline" className="gap-2" onClick={downloadTemplate}>
                <Download className="size-4" aria-hidden />
                Download Excel template
              </Button>
            </div>
            <form id="tasks-import-form" onSubmit={upload} className="space-y-2">
              <h4 className="text-sm font-medium">2. Upload completed file</h4>
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
          </>
        ) : (
          <p className="rounded-lg border p-3 text-sm">
            Created <strong>{result.created}</strong> · Skipped <strong>{result.skipped}</strong>
            {result.failed.length ? (
              <>
                {" "}
                · Failed <strong>{result.failed.length}</strong>
              </>
            ) : null}
          </p>
        )}
        {result?.failed.length ? (
          <ul className="max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
            {result.failed.slice(0, 20).map((row) => (
              <li key={`${row.row}-${row.reason}`}>
                Row {row.row}: {row.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </AppModal>
  );
}

export function notifyTaskImportResult(result: TaskImportResponseDto) {
  if (result.created === 0 && result.skipped > 0 && result.failed.length === 0) {
    toast.success(
      result.skipped === 1
        ? "That task already exists — nothing new to import."
        : `All ${result.skipped} tasks already exist — nothing new to import.`
    );
  } else if (result.created > 0 || result.skipped > 0) {
    toast.success(
      [
        result.created ? `Imported ${result.created}` : null,
        result.skipped ? `skipped ${result.skipped} duplicates` : null,
        result.failed.length ? `${result.failed.length} failed` : null
      ]
        .filter(Boolean)
        .join(" · ") + "."
    );
  } else {
    toast.error("No tasks imported. Check the failed rows.");
  }
}
