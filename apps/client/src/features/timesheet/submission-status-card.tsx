"use client";

import type { TimesheetPeriodDto } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from "@kloqra/ui";
import Link from "next/link";
import { SubmissionStatusDialogs } from "@/features/submissions/submission-status-dialogs";
import {
  submitButtonLabel,
  useSubmissionStatusActions
} from "@/features/submissions/use-submission-status-actions";

export type SubmissionStatusCardProps = {
  statusInfo: TimesheetPeriodDto;
  onSubmitted: () => void;
  anchorDate: Date;
  highlighted?: boolean;
};

export function SubmissionStatusCard({
  statusInfo,
  onSubmitted,
  anchorDate,
  highlighted = false
}: SubmissionStatusCardProps) {
  const actions = useSubmissionStatusActions(statusInfo, anchorDate, onSubmitted);

  const statusColors = {
    DRAFT: "bg-muted text-muted-foreground border-muted-foreground/20",
    SUBMITTED: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
    APPROVED: "bg-status-success-bg text-status-success-fg border-status-success-border",
    REJECTED: "bg-status-danger-bg text-status-danger-fg border-status-danger-border"
  };

  const statusLabels = {
    DRAFT: "Draft",
    SUBMITTED: "Pending review",
    APPROVED: "Approved",
    REJECTED: "Rejected"
  };

  return (
    <>
      <Card
        id={`submission-${statusInfo.projectId}`}
        interactive
        className={cn(
          highlighted &&
            "ring-2 ring-primary/40 ring-offset-2 ring-offset-background animate-highlight-pulse"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="truncate">{actions.projectName}</span>
            <span className="flex items-center gap-1 shrink-0">
              {actions.amendmentPending ? (
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-status-info-bg text-status-info-fg border-status-info-border transition-[background-color,border-color,color] duration-[var(--motion-base)]">
                  Edit pending
                </span>
              ) : null}
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-[background-color,border-color,color] duration-[var(--motion-base)] ${statusColors[actions.status]}`}
              >
                {statusLabels[actions.status]}
              </span>
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{actions.periodLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.status === "REJECTED" && actions.reviewNote && (
            <div className="text-sm border border-status-danger-border bg-status-danger-bg p-3 rounded-lg text-status-danger-fg">
              <p className="text-xs italic">Reason: &quot;{actions.reviewNote}&quot;</p>
            </div>
          )}

          {actions.status === "SUBMITTED" && (
            <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border">
              Submitted for review. Entries in this period are locked until reviewed.
            </div>
          )}

          {actions.canSubmit && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`submit-note-${statusInfo.projectId}`} className="text-xs">
                  Submission note (optional)
                </Label>
                <Input
                  id={`submit-note-${statusInfo.projectId}`}
                  value={actions.note}
                  onChange={(e) => actions.setNote(e.target.value)}
                  placeholder="Optional note for your approver"
                  disabled={actions.previewLoading || actions.submitting}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={actions.previewLoading || actions.submitting}
                onClick={() => void actions.loadPreview()}
              >
                {actions.previewLoading
                  ? "Loading…"
                  : `${submitButtonLabel(statusInfo.approvalPeriod)} for review`}
              </Button>
            </div>
          )}

          {actions.canRequestEdit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => actions.setAmendmentOpen(true)}
            >
              Request edit
            </Button>
          )}

          <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-xs" asChild>
            <Link href={`/timesheet?projectId=${statusInfo.projectId}`}>View timesheet</Link>
          </Button>
        </CardContent>
      </Card>

      <SubmissionStatusDialogs
        previewOpen={actions.previewOpen}
        onPreviewOpenChange={actions.setPreviewOpen}
        preview={actions.preview}
        previewLoading={actions.previewLoading}
        submitting={actions.submitting}
        onConfirmSubmit={() => void actions.confirmSubmit()}
        amendmentOpen={actions.amendmentOpen}
        onAmendmentOpenChange={actions.setAmendmentOpen}
        projectName={actions.projectName}
        periodLabel={actions.periodLabel}
        amendmentSubmitting={actions.amendmentSubmitting}
        onRequestAmendment={(reason) => void actions.requestAmendment(reason)}
      />
    </>
  );
}
