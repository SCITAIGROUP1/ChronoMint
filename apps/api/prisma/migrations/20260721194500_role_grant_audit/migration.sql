CREATE TABLE "role_grant_audit_events" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_grant_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "role_grant_audit_events_resource_id_created_at_idx"
    ON "role_grant_audit_events"("resource_id", "created_at" DESC);

CREATE INDEX "role_grant_audit_events_target_user_id_created_at_idx"
    ON "role_grant_audit_events"("target_user_id", "created_at" DESC);

CREATE INDEX "role_grant_audit_events_actor_user_id_created_at_idx"
    ON "role_grant_audit_events"("actor_user_id", "created_at" DESC);
