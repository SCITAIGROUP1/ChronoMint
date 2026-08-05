import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const apiRoot = process.cwd();
const schema = readFileSync(join(apiRoot, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(apiRoot, "prisma/migrations/20260722011500_permission_policy_persistence/migration.sql"),
  "utf8"
);

describe("permission policy persistence schema", () => {
  it("defines lookup uniqueness for role and principal override targets", () => {
    expect(schema).toContain("@@unique([tenantId, role, scope, resourceId, permission])");
    expect(schema).toContain("@@unique([tenantId, principalId, scope, resourceId, permission])");
    expect(migration).toContain(
      '"tenant_role_permission_overrides_tenant_id_role_scope_resource_id_permission_key"'
    );
    expect(migration).toContain(
      '"principal_permission_overrides_tenant_id_principal_id_scope_resource_id_permission_key"'
    );
  });

  it("constrains effects/scopes and leaves audit identities without foreign keys", () => {
    expect(migration).toContain(`CHECK ("effect" IN ('allow', 'deny'))`);
    expect(migration).toContain(
      `CHECK ("scope" IN ('platform', 'tenant', 'workspace', 'project', 'self'))`
    );
    const auditSection = migration.split('CREATE TABLE "permission_policy_audit_events"')[1];
    expect(auditSection).toBeDefined();
    expect(auditSection?.split("CREATE UNIQUE INDEX")[0]).not.toContain("FOREIGN KEY");
    expect(schema).toContain(
      "evidence remains queryable after principals, resources, or a tenant are deleted"
    );
  });

  it("creates revision, idempotency, audit-chain, and tenant lookup indexes additively", () => {
    expect(migration).toContain('CREATE TABLE "tenant_permission_policy_states"');
    expect(migration).toContain('CREATE TABLE "permission_policy_idempotency_records"');
    expect(migration).toContain('CREATE TABLE "permission_policy_audit_events"');
    expect(migration).toContain(
      '"permission_policy_idempotency_records_tenant_id_idempotency_key_key"'
    );
    expect(migration).toContain(
      '"permission_policy_audit_events_tenant_id_revision_event_index_key"'
    );
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|CONSTRAINT)\b/i);
  });
});
