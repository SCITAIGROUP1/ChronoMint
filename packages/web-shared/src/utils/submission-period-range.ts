import type { TimesheetApprovalPeriod } from "@kloqra/contracts";
import { addCalendarDaysToDateKey } from "./dashboard-period-presets";

/** Inclusive period end date key from a period start ISO and approval cadence. */
export function submissionPeriodEndDateKey(
  periodStartIso: string,
  approvalPeriod: TimesheetApprovalPeriod
): string {
  const startKey = periodStartIso.slice(0, 10);
  if (approvalPeriod === "daily") return startKey;
  if (approvalPeriod === "monthly") {
    const [y, m] = startKey.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${y}-${pad(m)}-${pad(lastDay)}`;
  }
  return addCalendarDaysToDateKey(startKey, 6);
}
