import type {
  CapabilitySnapshot,
  Permission,
  ResourceScope,
  ScopedCapabilityEntry
} from "@kloqra/contracts";

/**
 * Returns an exact, scoped capability presentation hint. Callers must never
 * treat this browser snapshot as authorization evidence.
 */
export function findCapabilityHint(
  snapshot: CapabilitySnapshot | null | undefined,
  permission: Permission,
  scope: ResourceScope,
  resourceId: string
): ScopedCapabilityEntry | undefined {
  return snapshot?.capabilities.find(
    (entry) =>
      entry.permission === permission && entry.scope === scope && entry.resourceId === resourceId
  );
}

export function isCapabilitySnapshotStale(
  snapshot: Pick<CapabilitySnapshot, "expiresAt"> | null | undefined,
  now = new Date()
): boolean {
  if (!snapshot) return true;
  return Date.parse(snapshot.expiresAt) <= now.getTime();
}
