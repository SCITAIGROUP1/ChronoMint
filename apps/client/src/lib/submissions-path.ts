import { ROUTES } from "@kloqra/contracts";

export function buildSubmissionsPath(query?: URLSearchParams) {
  const qs = query?.toString();
  return qs ? `${ROUTES.TIMESHEETS.MY_SUBMISSIONS}?${qs}` : ROUTES.TIMESHEETS.MY_SUBMISSIONS;
}
