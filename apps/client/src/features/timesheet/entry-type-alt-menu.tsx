"use client";

import {
  LEAVE_ENTRY_TYPE_OPTIONS,
  TIME_LOG_CLASSIFICATION_LABELS,
  type TenantActivityTypeDto,
  type TimeLogClassification
} from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import { useMemo, useState } from "react";
import { NON_PROJECT_ENTRY_COLORS } from "@/lib/non-project-entry-styles";

export type EntryTypeSelection = {
  classification: TimeLogClassification;
  activityTypeId?: string;
};

type EntryTypeAltMenuProps = {
  value: TimeLogClassification;
  activityTypeId?: string;
  activityTypes?: TenantActivityTypeDto[];
  disabled?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSelect: (selection: EntryTypeSelection) => void;
};

const OTHER_CHOICES = [
  {
    slug: "organizational" as const,
    label: "Organizational",
    hint: "Meetings, events, training",
    color: "#0d9488"
  },
  {
    slug: "recreational" as const,
    label: "Recreational",
    hint: "Team socials and downtime",
    color: "#059669"
  }
];

function TypeDot({ color }: { color: string }) {
  return (
    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
  );
}

function colorForClassification(classification: Exclude<TimeLogClassification, "PROJECT">) {
  return NON_PROJECT_ENTRY_COLORS[classification];
}

function selectedLabel(
  value: TimeLogClassification,
  activityTypeId: string | undefined,
  activityTypes: TenantActivityTypeDto[]
) {
  if (value === "PROJECT") return TIME_LOG_CLASSIFICATION_LABELS.PROJECT;
  if (value === "TENANT_ACTIVITY") {
    return (
      activityTypes.find((type) => type.id === activityTypeId)?.name ??
      TIME_LOG_CLASSIFICATION_LABELS.TENANT_ACTIVITY
    );
  }
  return (
    LEAVE_ENTRY_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    TIME_LOG_CLASSIFICATION_LABELS[value]
  );
}

function TypeChip({
  label,
  hint,
  color,
  selected,
  disabled,
  onSelect
}: {
  label: string;
  hint: string;
  color: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-transparent shadow-sm"
          : "border-border/80 bg-background hover:border-border hover:bg-muted/40",
        disabled && "pointer-events-none opacity-60"
      )}
      style={
        selected
          ? { backgroundColor: `${color}1a`, boxShadow: `inset 0 0 0 1.5px ${color}` }
          : undefined
      }
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <TypeDot color={color} />
        {label}
      </span>
      <span className="pl-3.5 text-[11px] leading-snug text-muted-foreground">{hint}</span>
    </button>
  );
}

function TypeChoiceGrid({
  value,
  activityTypeId,
  activityTypes,
  disabled,
  onSelect
}: {
  value: TimeLogClassification;
  activityTypeId?: string;
  activityTypes: TenantActivityTypeDto[];
  disabled?: boolean;
  onSelect: (selection: EntryTypeSelection) => void;
}) {
  const selectedOtherSlug =
    value !== "TENANT_ACTIVITY"
      ? undefined
      : activityTypes.find((type) => type.id === activityTypeId)?.slug === "recreational"
        ? "recreational"
        : "organizational";

  return (
    <div className="space-y-3" data-testid="entry-type-menu">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Leave</p>
        <div role="radiogroup" aria-label="Leave" className="grid grid-cols-3 gap-2">
          {LEAVE_ENTRY_TYPE_OPTIONS.map((option) => (
            <TypeChip
              key={option.value}
              label={option.label}
              hint={option.hint}
              color={colorForClassification(option.value)}
              selected={value === option.value}
              disabled={disabled}
              onSelect={() => onSelect({ classification: option.value })}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Other</p>
        <div role="radiogroup" aria-label="Other" className="grid grid-cols-2 gap-2">
          {OTHER_CHOICES.map((choice) => {
            const match = activityTypes.find((type) => type.slug === choice.slug);
            return (
              <TypeChip
                key={choice.slug}
                label={choice.label}
                hint={choice.hint}
                color={match?.color || choice.color}
                selected={selectedOtherSlug === choice.slug}
                disabled={disabled}
                onSelect={() =>
                  onSelect({
                    classification: "TENANT_ACTIVITY",
                    activityTypeId: match?.id
                  })
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function EntryTypeAltMenu({
  value,
  activityTypeId,
  activityTypes = [],
  disabled = false,
  expanded,
  onExpandedChange,
  onSelect
}: EntryTypeAltMenuProps) {
  const isProject = value === "PROJECT";
  const [uncontrolledOpen, setUncontrolledOpen] = useState(!isProject);
  const pickerOpen = expanded ?? uncontrolledOpen;
  const types = useMemo(() => activityTypes.filter((type) => type.isActive), [activityTypes]);
  const label = selectedLabel(value, activityTypeId, types);
  const badgeColor =
    value === "PROJECT"
      ? "#236bfe"
      : value === "TENANT_ACTIVITY"
        ? (types.find((type) => type.id === activityTypeId)?.color ??
          NON_PROJECT_ENTRY_COLORS.TENANT_ACTIVITY)
        : colorForClassification(value);

  function setPickerOpen(next: boolean) {
    setUncontrolledOpen(next);
    onExpandedChange?.(next);
  }

  if (disabled) {
    if (isProject) return null;
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-sm"
        data-testid="entry-type-badge"
      >
        <TypeDot color={badgeColor} />
        <span className="font-medium">{label}</span>
      </div>
    );
  }

  if (isProject && !pickerOpen) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        data-testid="entry-type-alt-link"
        onClick={() => setPickerOpen(true)}
      >
        Leave or other time
      </button>
    );
  }

  return (
    <div className="space-y-3" data-testid="entry-type-badge">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Type</p>
        {isProject ? (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setPickerOpen(false)}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            data-testid="entry-type-project-link"
            onClick={() => onSelect({ classification: "PROJECT" })}
          >
            Project work
          </button>
        )}
      </div>
      <TypeChoiceGrid
        value={value}
        activityTypeId={activityTypeId}
        activityTypes={types}
        onSelect={onSelect}
      />
    </div>
  );
}
