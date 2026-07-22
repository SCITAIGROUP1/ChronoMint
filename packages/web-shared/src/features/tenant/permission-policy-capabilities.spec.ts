import type { CapabilitySnapshot } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { findCapabilityHint, isCapabilitySnapshotStale } from "./permission-policy-capabilities";

const snapshot = {
  expiresAt: "2026-07-22T01:00:00.000Z",
  capabilities: [
    {
      permission: "tenant:ReadPermissionPolicy",
      scope: "tenant",
      resourceId: "tenant-1",
      allowed: true,
      source: "canonical-role"
    }
  ]
} as CapabilitySnapshot;

describe("permission policy capability hints", () => {
  it("returns only an exact scoped presentation hint", () => {
    expect(
      findCapabilityHint(snapshot, "tenant:ReadPermissionPolicy", "tenant", "tenant-1")
    ).toMatchObject({ allowed: true, source: "canonical-role" });
    expect(
      findCapabilityHint(snapshot, "tenant:ReadPermissionPolicy", "tenant", "tenant-2")
    ).toBeUndefined();
  });

  it("marks expired snapshots stale", () => {
    expect(isCapabilitySnapshotStale(snapshot, new Date("2026-07-22T02:00:00.000Z"))).toBe(true);
  });
});
