ALTER TABLE "tenant_activity_types" ADD COLUMN "parent_id" TEXT;

CREATE INDEX "tenant_activity_types_tenant_id_parent_id_idx"
  ON "tenant_activity_types"("tenant_id", "parent_id");

ALTER TABLE "tenant_activity_types"
  ADD CONSTRAINT "tenant_activity_types_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "tenant_activity_types"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
