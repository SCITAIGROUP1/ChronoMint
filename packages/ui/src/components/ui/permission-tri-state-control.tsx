"use client";

import type { PolicyConfigurationDto } from "@kloqra/contracts";
import { forwardRef, useRef } from "react";
import { cn } from "../../lib/utils.js";

const OPTIONS = [
  { value: "INHERIT", label: "Inherit" },
  { value: "ALLOW", label: "Allow" },
  { value: "DENY", label: "Deny" }
] as const satisfies ReadonlyArray<{ value: PolicyConfigurationDto; label: string }>;

export interface PermissionTriStateControlProps {
  value: PolicyConfigurationDto;
  onValueChange: (value: PolicyConfigurationDto) => void;
  "aria-label": string;
  disabled?: boolean;
  className?: string;
}

export const PermissionTriStateControl = forwardRef<HTMLDivElement, PermissionTriStateControlProps>(
  ({ value, onValueChange, disabled = false, className, "aria-label": ariaLabel }, ref) => {
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

    function select(index: number) {
      if (disabled) return;
      const option = OPTIONS[index];
      if (!option) return;
      onValueChange(option.value);
      buttonRefs.current[index]?.focus();
    }

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={cn(
          "inline-grid min-w-[17rem] grid-cols-3 rounded-lg border border-border bg-muted/40 p-1",
          className
        )}
      >
        {OPTIONS.map((option, index) => {
          const checked = value === option.value;
          return (
            <button
              key={option.value}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={disabled}
              tabIndex={checked ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => {
                let nextIndex: number | undefined;
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  nextIndex = (index + 1) % OPTIONS.length;
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  nextIndex = (index - 1 + OPTIONS.length) % OPTIONS.length;
                } else if (event.key === "Home") {
                  nextIndex = 0;
                } else if (event.key === "End") {
                  nextIndex = OPTIONS.length - 1;
                }
                if (nextIndex !== undefined) {
                  event.preventDefault();
                  select(nextIndex);
                }
              }}
              className={cn(
                "min-h-11 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                checked && option.value === "INHERIT" && "bg-background text-foreground shadow-sm",
                checked &&
                  option.value === "ALLOW" &&
                  "bg-status-success-bg text-status-success-fg shadow-sm",
                checked &&
                  option.value === "DENY" &&
                  "bg-destructive text-destructive-foreground shadow-sm",
                !checked && "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }
);

PermissionTriStateControl.displayName = "PermissionTriStateControl";
