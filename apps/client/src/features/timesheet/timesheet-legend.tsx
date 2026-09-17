import { cn } from "@kloqra/ui";
import { Clock, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { NON_PROJECT_ENTRY_COLORS } from "@/lib/non-project-entry-styles";

export type TimesheetLegendProps = {
  showOccupancy: boolean;
  showLiveTimer?: boolean;
  className?: string;
};

function LegendChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span className="inline-block h-2.5 w-3 rounded-[2px]" style={{ backgroundColor: color }} />
  );
}

export function TimesheetLegend({
  showOccupancy,
  showLiveTimer = false,
  className
}: TimesheetLegendProps) {
  return (
    <div
      className={cn("flex flex-nowrap items-center gap-1.5", className)}
      data-testid="timesheet-legend"
      aria-label="Calendar legend"
    >
      {showOccupancy ? (
        <LegendChip>
          <span
            className="inline-block h-2.5 w-3 rounded-[2px] border border-dashed border-muted-foreground/40 border-l-[3px] border-l-muted-foreground/50 bg-muted/40"
            aria-hidden
          />
          Busy elsewhere
        </LegendChip>
      ) : null}
      <LegendChip className="border-dashed border-muted-foreground/30 bg-transparent">
        <Lock className="h-3 w-3" aria-hidden />
        Locked
      </LegendChip>
      <LegendChip className="border-dotted border-muted-foreground/30 bg-transparent">
        <Clock className="h-3 w-3" aria-hidden />
        Timer
      </LegendChip>
      <LegendChip>
        <ColorSwatch color={NON_PROJECT_ENTRY_COLORS.PUBLIC_HOLIDAY} />
        Holiday
      </LegendChip>
      <LegendChip>
        <ColorSwatch color={NON_PROJECT_ENTRY_COLORS.LEAVE_FULL} />
        Leave
      </LegendChip>
      <LegendChip>
        <ColorSwatch color={NON_PROJECT_ENTRY_COLORS.TENANT_ACTIVITY} />
        Org activity
      </LegendChip>
      {showLiveTimer ? (
        <LegendChip className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          Live timer
        </LegendChip>
      ) : null}
    </div>
  );
}
