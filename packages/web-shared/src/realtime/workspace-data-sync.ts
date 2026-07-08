import { NotificationType, type WorkspaceDataInvalidateScope } from "@kloqra/contracts";

export const WORKSPACE_DATA_STALE_EVENT = "kloqra:workspace-data-stale";

export type WorkspaceDataStaleDetail = {
  workspaceId: string;
  scopes: WorkspaceDataInvalidateScope[];
};

const TIMESHEET_MEMBER_TYPES = new Set<string>([
  NotificationType.TIMESHEET_APPROVED,
  NotificationType.TIMESHEET_REJECTED,
  NotificationType.TIMESHEET_REMINDER,
  NotificationType.TIMESHEET_MISSING_DIGEST,
  NotificationType.TIMESHEET_AMENDMENT_APPROVED,
  NotificationType.TIMESHEET_AMENDMENT_DENIED,
  NotificationType.TIMESHEET_STATUS
]);

const ADMIN_PENDING_TYPES = new Set<string>([
  NotificationType.TIMESHEET_SUBMITTED,
  NotificationType.TIMESHEET_AMENDMENT_REQUESTED,
  NotificationType.APPROVAL_REQUEST
]);

const PROJECT_TYPES = new Set<string>([
  NotificationType.PROJECT_ASSIGNMENT,
  NotificationType.PROJECT_UNASSIGNED,
  NotificationType.PROJECT_DEACTIVATED,
  NotificationType.TASK_ASSIGNMENT,
  NotificationType.TASK_UNASSIGNED
]);

export function scopesForNotificationType(type: string): WorkspaceDataInvalidateScope[] {
  const scopes = new Set<WorkspaceDataInvalidateScope>();
  if (TIMESHEET_MEMBER_TYPES.has(type)) {
    scopes.add("submissions");
    scopes.add("timesheet");
    scopes.add("timelogs");
  }
  if (type === NotificationType.TIMESHEET_STATUS) {
    scopes.add("projects");
  }
  if (ADMIN_PENDING_TYPES.has(type)) {
    scopes.add("pending_approvals");
  }
  if (PROJECT_TYPES.has(type)) {
    scopes.add("projects");
    scopes.add("tasks");
  }
  return [...scopes];
}

export function dispatchWorkspaceDataStale(detail: WorkspaceDataStaleDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_DATA_STALE_EVENT, { detail }));
}

const invalidationHandlers = new Set<(detail: WorkspaceDataStaleDetail) => void>();

export function registerWorkspaceDataInvalidation(
  handler: (detail: WorkspaceDataStaleDetail) => void
): () => void {
  invalidationHandlers.add(handler);
  return () => invalidationHandlers.delete(handler);
}

/** Scopes the API echoes after timelog CRUD — suppress self-echo for this window. */
const LOCAL_TIMELOG_ECHO_SCOPES = new Set<WorkspaceDataInvalidateScope>([
  "timelogs",
  "timesheet",
  "submissions"
]);

const LOCAL_MUTATION_ECHO_MS = 2_500;
const localMutationEchoUntil = new Map<string, number>();

/**
 * Call after a tab applies its own timelog mutation. Socket `workspace.data.stale`
 * for the same workspace is ignored briefly so we don't refetch what we just confirmed.
 * Other tabs still process the socket event normally.
 */
export function noteLocalTimelogMutation(workspaceId: string): void {
  if (!workspaceId) return;
  localMutationEchoUntil.set(workspaceId, Date.now() + LOCAL_MUTATION_ECHO_MS);
}

/** True when a socket/local stale event is the creating tab's own CRUD echo. */
export function shouldSuppressLocalTimelogMutationEcho(
  workspaceId: string,
  scopes: readonly WorkspaceDataInvalidateScope[]
): boolean {
  if (!workspaceId || scopes.length === 0) return false;
  const until = localMutationEchoUntil.get(workspaceId);
  if (!until) return false;
  if (Date.now() > until) {
    localMutationEchoUntil.delete(workspaceId);
    return false;
  }
  // Only suppress timelog-derived echoes — never hide project/approval notifications.
  return scopes.every((scope) => LOCAL_TIMELOG_ECHO_SCOPES.has(scope));
}

/** Test helper — clear echo suppression window. */
export function clearLocalTimelogMutationEchoGuards(): void {
  localMutationEchoUntil.clear();
}

export function invalidateWorkspaceData(
  workspaceId: string,
  scopes: WorkspaceDataInvalidateScope[]
): void {
  if (scopes.length === 0) return;
  const detail: WorkspaceDataStaleDetail = { workspaceId, scopes };
  dispatchWorkspaceDataStale(detail);
  for (const handler of invalidationHandlers) {
    handler(detail);
  }
}
