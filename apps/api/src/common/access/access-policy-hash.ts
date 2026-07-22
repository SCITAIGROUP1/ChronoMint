import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

export function deterministicSha256(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export interface PermissionAuditHashFacts {
  tenantId: string;
  revision: number;
  eventIndex: number;
  actorPrincipalId: string;
  targetType: "ROLE" | "PRINCIPAL";
  targetId: string;
  role: string | null;
  scope: string;
  resourceId: string;
  permission: string;
  beforeEffect: string | null;
  afterEffect: string | null;
  effectiveBefore: string;
  effectiveAfter: string;
  reason: string;
  idempotencyKey: string;
  previousHash: string | null;
}

export function permissionAuditEventHash(facts: PermissionAuditHashFacts): string {
  return deterministicSha256(facts);
}
