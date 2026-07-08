"use client";

/**
 * @deprecated Folded into `useWorkspaceQuerySync` (shell). Kept as a no-op export so
 * older call sites compile; mounting both caused duplicate timelog/submissions GETs.
 */
export function useTimelogQuerySync(): void {
  // no-op
}
