-- AlterTable
ALTER TABLE "role_grant_audit_events" ADD COLUMN     "actor_type" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "decision_reason" TEXT,
ADD COLUMN     "policy_version" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "prior_role" TEXT,
ADD COLUMN     "request_id" TEXT,
ADD COLUMN     "request_source" TEXT NOT NULL DEFAULT 'api',
ADD COLUMN     "tenant_id" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "role_grant_audit_events_tenant_id_scope_resource_id_created_idx" ON "role_grant_audit_events"("tenant_id", "scope", "resource_id", "created_at" DESC);
