-- CreateTable
CREATE TABLE "user_favorite_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_favorite_projects_user_id_workspace_id_created_at_idx" ON "user_favorite_projects"("user_id", "workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_projects_user_id_project_id_key" ON "user_favorite_projects"("user_id", "project_id");

-- CreateIndex
CREATE INDEX "user_favorite_tasks_user_id_workspace_id_created_at_idx" ON "user_favorite_tasks"("user_id", "workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_tasks_user_id_task_id_key" ON "user_favorite_tasks"("user_id", "task_id");

-- AddForeignKey
ALTER TABLE "user_favorite_projects" ADD CONSTRAINT "user_favorite_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_projects" ADD CONSTRAINT "user_favorite_projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_projects" ADD CONSTRAINT "user_favorite_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_tasks" ADD CONSTRAINT "user_favorite_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_tasks" ADD CONSTRAINT "user_favorite_tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_tasks" ADD CONSTRAINT "user_favorite_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "permission_policy_audit_events_tenant_id_revision_event_index_k" RENAME TO "permission_policy_audit_events_tenant_id_revision_event_ind_key";

-- RenameIndex
ALTER INDEX "permission_policy_audit_events_tenant_id_scope_resource_id_perm" RENAME TO "permission_policy_audit_events_tenant_id_scope_resource_id__idx";

-- RenameIndex
ALTER INDEX "permission_policy_audit_events_tenant_id_target_type_target_id_" RENAME TO "permission_policy_audit_events_tenant_id_target_type_target_idx";

-- RenameIndex
ALTER INDEX "principal_permission_overrides_tenant_id_principal_id_scope_res" RENAME TO "principal_permission_overrides_tenant_id_principal_id_scope_key";

-- RenameIndex
ALTER INDEX "principal_permission_overrides_tenant_id_scope_resource_id_prin" RENAME TO "principal_permission_overrides_tenant_id_scope_resource_id__idx";

-- RenameIndex
ALTER INDEX "tenant_role_permission_overrides_tenant_id_role_scope_resource_" RENAME TO "tenant_role_permission_overrides_tenant_id_role_scope_resou_key";

-- RenameIndex
ALTER INDEX "tenant_role_permission_overrides_tenant_id_scope_resource_id_pe" RENAME TO "tenant_role_permission_overrides_tenant_id_scope_resource_i_idx";
