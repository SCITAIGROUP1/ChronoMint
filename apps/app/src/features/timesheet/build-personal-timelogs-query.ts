import { ROUTES } from "@kloqra/contracts";

/** Personal timesheet/timer list: always pin to the signed-in user. */
export function buildPersonalTimelogsQuery(from: Date, to: Date, userId: string): string {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    userId
  });
  return `${ROUTES.TIMELOGS.LIST}?${params}`;
}
