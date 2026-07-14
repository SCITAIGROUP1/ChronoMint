"use client";

import {
  ROUTES,
  type ExtendPlatformTenantTrialResponseDto,
  type PlatformTenantSubscriptionSummaryDto
} from "@kloqra/contracts";
import {
  AppModal,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePicker,
  Label,
  dateKeyFromDate,
  formatDateKeyLabel
} from "@kloqra/ui";
import { api } from "@kloqra/web-shared";
import { CalendarPlus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatTrialEndLabel,
  localDateKeyToEndOfDayIso,
  previewTrialEndsAtFromDays
} from "./trial-extend.util";

const PRESET_DAYS = [7, 14, 30] as const;
const MAX_TRIAL_EXTEND_DAYS = 365;

type PendingExtend =
  | { kind: "days"; extendDays: number; previewEndsAt: Date; previewLabel: string }
  | { kind: "date"; trialEndsAt: string; previewEndsAt: Date; previewLabel: string };

function maxTrialEndDateKey(now = new Date()): string {
  const max = new Date(now);
  max.setDate(max.getDate() + MAX_TRIAL_EXTEND_DAYS);
  return dateKeyFromDate(max);
}

type TenantTrialExtendCardProps = {
  tenantId: string;
  subscription: Pick<PlatformTenantSubscriptionSummaryDto, "status" | "trialEndsAt">;
  disabled?: boolean;
  onExtended?: (result: ExtendPlatformTenantTrialResponseDto) => void;
};

export function TenantTrialExtendCard({
  tenantId,
  subscription,
  disabled = false,
  onExtended
}: TenantTrialExtendCardProps) {
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [pending, setPending] = useState<PendingExtend | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const maxDate = useMemo(() => maxTrialEndDateKey(), []);

  const trialLabel = useMemo(
    () => formatTrialEndLabel(subscription.trialEndsAt),
    [subscription.trialEndsAt]
  );

  if (subscription.status === "canceled") {
    return null;
  }

  function resetModalState() {
    setCustomDate("");
    setPending(null);
    setError("");
  }

  function openModal() {
    resetModalState();
    setOpen(true);
  }

  function selectDays(extendDays: number) {
    setCustomDate("");
    setError("");
    const previewEndsAt = previewTrialEndsAtFromDays(subscription.trialEndsAt, extendDays);
    setPending({
      kind: "days",
      extendDays,
      previewEndsAt,
      previewLabel: formatDateKeyLabel(dateKeyFromDate(previewEndsAt))
    });
  }

  function selectCustomDate(value: string) {
    setCustomDate(value);
    setError("");
    if (!value) {
      setPending(null);
      return;
    }
    const trialEndsAt = localDateKeyToEndOfDayIso(value);
    setPending({
      kind: "date",
      trialEndsAt,
      previewEndsAt: new Date(trialEndsAt),
      previewLabel: formatDateKeyLabel(value)
    });
  }

  async function confirmExtend() {
    if (!pending) {
      setError("Choose a preset or a custom end date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body =
        pending.kind === "days"
          ? { extendDays: pending.extendDays }
          : { trialEndsAt: pending.trialEndsAt };
      const result = await api<ExtendPlatformTenantTrialResponseDto>(
        ROUTES.PLATFORM.TENANT_EXTEND_TRIAL(tenantId),
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );
      setMessage(`Trial extended. ${formatTrialEndLabel(result.subscription.trialEndsAt)}`);
      setOpen(false);
      resetModalState();
      onExtended?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not extend trial.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card data-testid="tenant-trial-extend-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Trial</CardTitle>
            <CardDescription>
              Extend the organization trial. Status will be set to trial.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={disabled || saving}
            data-testid="extend-trial-open"
            onClick={openModal}
          >
            Extend trial
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm" data-testid="tenant-trial-current-end">
            <span className="text-muted-foreground">Current: </span>
            {trialLabel}
            {subscription.status !== "trial" ? (
              <span className="text-muted-foreground"> · status {subscription.status}</span>
            ) : null}
          </p>
          {message ? (
            <p className="text-sm text-muted-foreground" data-testid="extend-trial-message">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AppModal
        open={open}
        onOpenChange={(next) => {
          if (saving) return;
          setOpen(next);
          if (!next) resetModalState();
        }}
        title="Extend trial"
        description="Choose a preset or a custom end date. Confirming sets subscription status to trial."
        icon={<CalendarPlus className="h-5 w-5 text-primary" />}
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                resetModalState();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !pending}
              data-testid="extend-trial-confirm"
              onClick={() => void confirmExtend()}
            >
              {saving ? "Extending…" : "Confirm extension"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5" data-testid="extend-trial-modal">
          <p className="text-sm text-muted-foreground">
            Current: {trialLabel}
            {subscription.status !== "trial" ? ` · status ${subscription.status}` : ""}
          </p>

          <div className="space-y-2">
            <Label>Quick extend</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_DAYS.map((days) => {
                const selected = pending?.kind === "days" && pending.extendDays === days;
                return (
                  <Button
                    key={days}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    disabled={saving}
                    data-testid={`extend-trial-${days}`}
                    onClick={() => selectDays(days)}
                  >
                    +{days} days
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom end date</Label>
            <div data-testid="extend-trial-custom-date">
              <DatePicker
                value={customDate}
                onChange={selectCustomDate}
                placeholder="Select end date"
                ariaLabel="Custom trial end date"
                disabled={saving}
                maxDate={maxDate}
                className="h-10 w-full justify-start bg-background"
                popoverAlign="start"
              />
            </div>
          </div>

          {pending ? (
            <div
              className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-sm"
              data-testid="extend-trial-preview"
            >
              <span className="text-muted-foreground">New trial ends </span>
              <span className="font-medium">{pending.previewLabel}</span>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" data-testid="extend-trial-error">
              {error}
            </p>
          ) : null}
        </div>
      </AppModal>
    </>
  );
}
