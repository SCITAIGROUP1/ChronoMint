CREATE TABLE "tenant_role_permission_overrides" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_role_permission_overrides_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_role_permission_overrides_scope_check"
      CHECK ("scope" IN ('platform', 'tenant', 'workspace', 'project', 'self')),
    CONSTRAINT "tenant_role_permission_overrides_effect_check"
      CHECK ("effect" IN ('allow', 'deny')),
    CONSTRAINT "tenant_role_permission_overrides_resource_check"
      CHECK (length("resource_id") > 0 AND length("permission") > 0),
    CONSTRAINT "tenant_role_permission_overrides_role_check"
      CHECK ("role" IN ('PLATFORM_SUPERADMIN', 'PLATFORM_SUPPORT', 'TENANT_OWNER', 'TENANT_ADMIN', 'WORKSPACE_ADMIN', 'WORKSPACE_MEMBER', 'PROJECT_MANAGER'))
);

CREATE TABLE "principal_permission_overrides" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "principal_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "principal_permission_overrides_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "principal_permission_overrides_scope_check"
      CHECK ("scope" IN ('platform', 'tenant', 'workspace', 'project', 'self')),
    CONSTRAINT "principal_permission_overrides_effect_check"
      CHECK ("effect" IN ('allow', 'deny')),
    CONSTRAINT "principal_permission_overrides_resource_check"
      CHECK (length("resource_id") > 0 AND length("principal_id") > 0 AND length("permission") > 0)
);

CREATE TABLE "tenant_permission_policy_states" (
    "tenant_id" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "policy_checksum" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "last_audit_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_permission_policy_states_pkey" PRIMARY KEY ("tenant_id"),
    CONSTRAINT "tenant_permission_policy_states_revision_check" CHECK ("revision" >= 0)
);

CREATE TABLE "permission_policy_idempotency_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "revision" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permission_policy_idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permission_policy_audit_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "event_index" INTEGER NOT NULL,
    "actor_principal_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "role" TEXT,
    "scope" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "before_effect" TEXT,
    "after_effect" TEXT,
    "effective_before" TEXT NOT NULL,
    "effective_after" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "previous_hash" TEXT,
    "event_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permission_policy_audit_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "permission_policy_audit_events_target_check" CHECK ("target_type" IN ('ROLE', 'PRINCIPAL')),
    CONSTRAINT "permission_policy_audit_events_scope_check" CHECK ("scope" IN ('platform', 'tenant', 'workspace', 'project', 'self')),
    CONSTRAINT "permission_policy_audit_events_before_check" CHECK ("before_effect" IS NULL OR "before_effect" IN ('allow', 'deny')),
    CONSTRAINT "permission_policy_audit_events_after_check" CHECK ("after_effect" IS NULL OR "after_effect" IN ('allow', 'deny')),
    CONSTRAINT "permission_policy_audit_events_effective_before_check" CHECK ("effective_before" IN ('allow', 'deny')),
    CONSTRAINT "permission_policy_audit_events_effective_after_check" CHECK ("effective_after" IN ('allow', 'deny'))
);

CREATE UNIQUE INDEX "tenant_role_permission_overrides_tenant_id_role_scope_resource_id_permission_key"
  ON "tenant_role_permission_overrides"("tenant_id", "role", "scope", "resource_id", "permission");
CREATE INDEX "tenant_role_permission_overrides_tenant_id_scope_resource_id_permission_idx"
  ON "tenant_role_permission_overrides"("tenant_id", "scope", "resource_id", "permission");
CREATE UNIQUE INDEX "principal_permission_overrides_tenant_id_principal_id_scope_resource_id_permission_key"
  ON "principal_permission_overrides"("tenant_id", "principal_id", "scope", "resource_id", "permission");
CREATE INDEX "principal_permission_overrides_tenant_id_scope_resource_id_principal_id_permission_idx"
  ON "principal_permission_overrides"("tenant_id", "scope", "resource_id", "principal_id", "permission");
CREATE UNIQUE INDEX "permission_policy_idempotency_records_tenant_id_idempotency_key_key"
  ON "permission_policy_idempotency_records"("tenant_id", "idempotency_key");
CREATE INDEX "permission_policy_idempotency_records_tenant_id_created_at_idx"
  ON "permission_policy_idempotency_records"("tenant_id", "created_at" DESC);
CREATE UNIQUE INDEX "permission_policy_audit_events_tenant_id_revision_event_index_key"
  ON "permission_policy_audit_events"("tenant_id", "revision", "event_index");
CREATE UNIQUE INDEX "permission_policy_audit_events_tenant_id_event_hash_key"
  ON "permission_policy_audit_events"("tenant_id", "event_hash");
CREATE INDEX "permission_policy_audit_events_tenant_id_created_at_idx"
  ON "permission_policy_audit_events"("tenant_id", "created_at" DESC);
CREATE INDEX "permission_policy_audit_events_tenant_id_scope_resource_id_permission_created_at_idx"
  ON "permission_policy_audit_events"("tenant_id", "scope", "resource_id", "permission", "created_at" DESC);
CREATE INDEX "permission_policy_audit_events_tenant_id_target_type_target_id_created_at_idx"
  ON "permission_policy_audit_events"("tenant_id", "target_type", "target_id", "created_at" DESC);

ALTER TABLE "tenant_role_permission_overrides"
  ADD CONSTRAINT "tenant_role_permission_overrides_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "principal_permission_overrides"
  ADD CONSTRAINT "principal_permission_overrides_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_permission_policy_states"
  ADD CONSTRAINT "tenant_permission_policy_states_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "permission_policy_idempotency_records"
  ADD CONSTRAINT "permission_policy_idempotency_records_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
