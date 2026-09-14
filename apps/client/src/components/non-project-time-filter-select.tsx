"use client";

import type { NonProjectTimeFilter } from "@kloqra/contracts";
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kloqra/ui";

const OPTIONS: { value: NonProjectTimeFilter; label: string }[] = [
  { value: "include", label: "Include" },
  { value: "exclude", label: "Exclude" },
  { value: "only", label: "Only non-project" }
];

export function NonProjectTimeFilterSelect({
  value,
  onChange,
  id = "non-project-time"
}: {
  value: NonProjectTimeFilter;
  onChange: (value: NonProjectTimeFilter) => void;
  id?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Non-project time
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as NonProjectTimeFilter)}>
        <SelectTrigger id={id} className="bg-background" data-testid="non-project-time-filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
