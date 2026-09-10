import { cn } from "@kloqra/ui";
import { TEAM_LIVE_STATUS_META, type TeamLiveStatus } from "./team-live-status";

export function TeamLiveStatusCard({
  status,
  count,
  selected,
  onSelect
}: {
  status: TeamLiveStatus;
  count: number;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const meta = TEAM_LIVE_STATUS_META[status];
  const interactive = Boolean(onSelect);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!interactive}
      className={cn(
        "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
        interactive && "hover:border-primary/30 hover:bg-muted/20",
        selected && "border-primary/40 ring-1 ring-primary/20",
        !interactive && "cursor-default"
      )}
      aria-pressed={selected}
      aria-label={`${meta.label}: ${count}. ${meta.description}`}
    >
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} aria-hidden />
        <span className="text-sm text-muted-foreground">{meta.label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{count}</p>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{meta.description}</p>
    </button>
  );
}
