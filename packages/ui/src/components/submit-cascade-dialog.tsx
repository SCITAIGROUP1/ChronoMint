"use client";

import type { TimesheetSubmitPreviewDto } from "@kloqra/contracts";
import { AlertTriangle, Clock } from "lucide-react";
import {
  earlySubmitDialogCopy,
  formatSubmissionPeriodLabel,
  isOpenTimesheetPeriod,
  openTimesheetPeriodHint
} from "./submission-period-label.js";
import { AppModal } from "./ui/app-modal.js";
import { Button } from "./ui/button.js";

export type SubmitCascadeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: TimesheetSubmitPreviewDto | null;
  loading?: boolean;
  submitting?: boolean;
  onConfirm: () => void;
  timezone?: string;
};

export function SubmitCascadeDialog({
  open,
  onOpenChange,
  preview,
  loading = false,
  submitting = false,
  onConfirm,
  timezone = "UTC"
}: SubmitCascadeDialogProps) {
  const blocked = Boolean(preview?.blockedReason);
  const periodOpen = Boolean(preview && isOpenTimesheetPeriod(preview.targetPeriod.periodEnd));
  const earlyCopy = preview ? earlySubmitDialogCopy(preview.targetPeriod.approvalPeriod) : null;
  const title = periodOpen && earlyCopy ? earlyCopy.title : "Submit for review";
  const description =
    periodOpen && earlyCopy
      ? earlyCopy.description
      : "Review the periods that will be locked after submission.";
  const confirmLabel = periodOpen && earlyCopy ? earlyCopy.confirm : "Submit for review";

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={periodOpen ? <Clock className="size-5" /> : <AlertTriangle className="size-5" />}
      tone={blocked ? "destructive" : "warning"}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || submitting || blocked || !preview}
            onClick={onConfirm}
          >
            {submitting ? "Submitting…" : confirmLabel}
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading preview…</p>
      ) : blocked ? (
        <p className="text-sm text-destructive">{preview?.blockedReason}</p>
      ) : preview ? (
        <div className="space-y-4 text-sm">
          <div
            className={
              periodOpen
                ? "rounded-lg border border-status-info-border bg-status-info-bg p-3"
                : "rounded-lg border border-border/60 bg-muted/20 p-3"
            }
          >
            <p className="font-medium">{preview.targetPeriod.projectName}</p>
            <p className="text-muted-foreground mt-1">
              {formatSubmissionPeriodLabel(
                preview.targetPeriod.periodStart,
                preview.targetPeriod.approvalPeriod,
                timezone,
                preview.targetPeriod.periodEnd
              )}
            </p>
            {periodOpen ? (
              <p className="text-status-info-fg mt-2 text-xs">
                {openTimesheetPeriodHint(
                  preview.targetPeriod.approvalPeriod,
                  preview.targetPeriod.periodEnd,
                  timezone
                )}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Entries in this period will be locked until approved or unlocked by an admin.
          </p>
        </div>
      ) : null}
    </AppModal>
  );
}
