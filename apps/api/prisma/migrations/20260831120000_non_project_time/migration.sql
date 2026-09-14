-- Tenant holiday calendar and activity-type catalog (org-wide, not project-scoped).
CREATE TABLE "tenant_holidays" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_holidays_tenant_id_date_key" ON "tenant_holidays"("tenant_id", "date");
CREATE INDEX "tenant_holidays_tenant_id_date_idx" ON "tenant_holidays"("tenant_id", "date");

ALTER TABLE "tenant_holidays"
  ADD CONSTRAINT "tenant_holidays_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tenant_activity_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "color" TEXT NOT NULL DEFAULT '#0d9488',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_activity_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_activity_types_tenant_id_name_key" ON "tenant_activity_types"("tenant_id", "name");
CREATE INDEX "tenant_activity_types_tenant_id_is_active_idx" ON "tenant_activity_types"("tenant_id", "is_active");

ALTER TABLE "tenant_activity_types"
  ADD CONSTRAINT "tenant_activity_types_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Non-project time columns on partitioned time_logs (parent ALTER applies to partitions).
ALTER TABLE "time_logs" ALTER COLUMN "task_id" DROP NOT NULL;

ALTER TABLE "time_logs"
  ADD COLUMN "classification" TEXT NOT NULL DEFAULT 'PROJECT',
  ADD COLUMN "tenant_id" TEXT,
  ADD COLUMN "workspace_id" TEXT,
  ADD COLUMN "activity_type_id" TEXT,
  ADD COLUMN "holiday_id" TEXT;

ALTER TABLE "time_logs"
  ADD CONSTRAINT "time_log_classification_check"
  CHECK ("classification" IN ('PROJECT', 'PUBLIC_HOLIDAY', 'LEAVE_FULL', 'LEAVE_HALF', 'TENANT_ACTIVITY'));

ALTER TABLE "time_logs"
  ADD CONSTRAINT "time_log_classification_shape_check"
  CHECK (
    ("classification" = 'PROJECT' AND "task_id" IS NOT NULL)
    OR ("classification" <> 'PROJECT' AND "task_id" IS NULL AND "tenant_id" IS NOT NULL)
  );

ALTER TABLE "time_logs"
  ADD CONSTRAINT "time_log_activity_type_check"
  CHECK ("classification" <> 'TENANT_ACTIVITY' OR "activity_type_id" IS NOT NULL);

CREATE INDEX "time_logs_tenant_id_start_time_idx" ON "time_logs"("tenant_id", "start_time");
CREATE INDEX "time_logs_workspace_id_start_time_idx" ON "time_logs"("workspace_id", "start_time");
CREATE INDEX "time_logs_classification_start_time_idx" ON "time_logs"("classification", "start_time");

ALTER TABLE "time_logs"
  ADD CONSTRAINT "time_logs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_logs"
  ADD CONSTRAINT "time_logs_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "time_logs"
  ADD CONSTRAINT "time_logs_activity_type_id_fkey"
  FOREIGN KEY ("activity_type_id") REFERENCES "tenant_activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "time_logs"
  ADD CONSTRAINT "time_logs_holiday_id_fkey"
  FOREIGN KEY ("holiday_id") REFERENCES "tenant_holidays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed system activity types for existing tenants.
INSERT INTO "tenant_activity_types" ("id", "tenant_id", "name", "slug", "color", "is_system", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, t."id", 'Office Event', 'office_event', '#0d9488', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" t
ON CONFLICT ("tenant_id", "name") DO NOTHING;

INSERT INTO "tenant_activity_types" ("id", "tenant_id", "name", "slug", "color", "is_system", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, t."id", 'Office Meeting', 'office_meeting', '#0891b2', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" t
ON CONFLICT ("tenant_id", "name") DO NOTHING;
