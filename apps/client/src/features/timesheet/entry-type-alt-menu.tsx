"use client";

import {
  TIME_LOG_CLASSIFICATION_LABELS,
  activityTypeLabel,
  groupTenantActivityTypes,
  type TenantActivityTypeDto,
  type TimeLogClassification
} from "@kloqra/contracts";
import { Label, SearchableSelect, type SearchableSelectGroup } from "@kloqra/ui";
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
      activityTypeLabel(activityTypes, activityTypeId) ??
      TIME_LOG_CLASSIFICATION_LABELS.TENANT_ACTIVITY
    );
  }
  return TIME_LOG_CLASSIFICATION_LABELS[value];
}

function buildActivitySelectGroups(types: TenantActivityTypeDto[]): {
  options?: { value: string; label: string }[];
  groups?: SearchableSelectGroup[];
} {
  const { roots, childrenByParentId } = groupTenantActivityTypes(types);
  const leafRoots = roots.filter((type) => !childrenByParentId.has(type.id));
  const parentGroups = roots
    .filter((type) => childrenByParentId.has(type.id))
    .map((type) => ({
      label: type.name,
      options: (childrenByParentId.get(type.id) ?? []).map((child) => ({
        value: child.id,
        label: child.name
      }))
    }));

  if (parentGroups.length === 0) {
    return {
      options: leafRoots.map((type) => ({ value: type.id, label: type.name }))
    };
  }

  return {
    groups: [
      ...(leafRoots.length > 0
        ? [
            {
              label: "Activities",
              options: leafRoots.map((type) => ({ value: type.id, label: type.name }))
            }
          ]
        : []),
      ...parentGroups
    ]
  };
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
  const selectModel = useMemo(() => buildActivitySelectGroups(types), [types]);
  const colorById = useMemo(() => new Map(types.map((type) => [type.id, type.color])), [types]);

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
        className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
        data-testid="entry-type-alt-link"
        onClick={() => setPickerOpen(true)}
      >
        Other time
      </button>
    );
  }

  return (
    <div className="space-y-2" data-testid="entry-type-badge">
      <div className="flex items-center justify-between gap-3">
        <Label>Activity</Label>
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
      <div data-testid="entry-type-menu">
        <SearchableSelect
          value={activityTypeId || ""}
          onValueChange={(nextId) =>
            onSelect({
              classification: "TENANT_ACTIVITY",
              activityTypeId: nextId
            })
          }
          options={selectModel.options}
          groups={selectModel.groups}
          placeholder="Select activity"
          searchPlaceholder="Search activities…"
          emptyMessage={
            types.length === 0 ? "No organization activities yet." : "No matching activities."
          }
          contentClassName="z-[100]"
          aria-label="Activity"
          renderOption={(option) => (
            <span className="flex items-center gap-2">
              <TypeDot color={colorById.get(option.value) ?? "#0d9488"} />
              {option.label}
            </span>
          )}
          renderValue={(option) =>
            option ? (
              <span className="flex items-center gap-2">
                <TypeDot color={colorById.get(option.value) ?? "#0d9488"} />
                {activityTypeLabel(types, option.value) ?? option.label}
              </span>
            ) : (
              "Select activity"
            )
          }
        />
      </div>
    </div>
  );
}
