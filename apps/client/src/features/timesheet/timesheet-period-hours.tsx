export type TimesheetPeriodView = "day" | "week" | "month";

export function formatTimesheetPeriodHours(totalSec: number): string {
  if (totalSec <= 0) return "0h";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function timesheetPeriodHoursAriaLabel(totalSec: number, view: TimesheetPeriodView): string {
  const period = view === "day" ? "day" : view === "week" ? "week" : "month";
  return `${formatTimesheetPeriodHours(totalSec)} logged this ${period}`;
}

export function TimesheetPeriodHours({
  totalSec,
  view
}: {
  totalSec: number;
  view: TimesheetPeriodView;
}) {
  const label = formatTimesheetPeriodHours(totalSec);
  return (
    <span
      className="inline-flex h-8 items-center text-sm font-semibold tabular-nums text-primary"
      aria-label={timesheetPeriodHoursAriaLabel(totalSec, view)}
      title={timesheetPeriodHoursAriaLabel(totalSec, view)}
    >
      {label}
    </span>
  );
}
