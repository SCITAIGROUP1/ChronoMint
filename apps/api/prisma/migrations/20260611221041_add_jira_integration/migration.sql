-- CreateTable
CREATE TABLE "jira_connections" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "cloud_id" TEXT NOT NULL,
    "site_url" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_project_mappings" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "jira_project_id" TEXT NOT NULL,
    "jira_project_key" TEXT NOT NULL,
    "jira_project_name" TEXT NOT NULL,
    "chrono_project_id" TEXT,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sync_direction" TEXT NOT NULL DEFAULT 'JIRA_TO_CHRONO',
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_project_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_user_mappings" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "jira_account_id" TEXT NOT NULL,
    "jira_email" TEXT NOT NULL,
    "jira_display_name" TEXT NOT NULL,
    "user_id" TEXT,
    "auto_matched" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_user_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_issue_cache" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "jira_issue_id" TEXT NOT NULL,
    "jira_issue_key" TEXT NOT NULL,
    "jira_project_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "priority" TEXT,
    "assignee_id" TEXT,
    "story_points" DOUBLE PRECISION,
    "sprint_id" TEXT,
    "sprint_name" TEXT,
    "labels" TEXT[],
    "due_date" DATE,
    "task_id" TEXT,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_issue_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_worklog_syncs" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "time_log_id" TEXT NOT NULL,
    "jira_issue_key" TEXT NOT NULL,
    "jira_worklog_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_worklog_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_sync_logs" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jira_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jira_connections_workspace_id_key" ON "jira_connections"("workspace_id");

-- CreateIndex
CREATE INDEX "jira_project_mappings_connection_id_idx" ON "jira_project_mappings"("connection_id");

-- CreateIndex
CREATE INDEX "jira_project_mappings_chrono_project_id_idx" ON "jira_project_mappings"("chrono_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_project_mappings_connection_id_jira_project_id_key" ON "jira_project_mappings"("connection_id", "jira_project_id");

-- CreateIndex
CREATE INDEX "jira_user_mappings_connection_id_idx" ON "jira_user_mappings"("connection_id");

-- CreateIndex
CREATE INDEX "jira_user_mappings_workspace_id_idx" ON "jira_user_mappings"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_user_mappings_connection_id_jira_account_id_key" ON "jira_user_mappings"("connection_id", "jira_account_id");

-- CreateIndex
CREATE INDEX "jira_issue_cache_connection_id_idx" ON "jira_issue_cache"("connection_id");

-- CreateIndex
CREATE INDEX "jira_issue_cache_jira_project_id_idx" ON "jira_issue_cache"("jira_project_id");

-- CreateIndex
CREATE INDEX "jira_issue_cache_assignee_id_idx" ON "jira_issue_cache"("assignee_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_issue_cache_connection_id_jira_issue_id_key" ON "jira_issue_cache"("connection_id", "jira_issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_worklog_syncs_time_log_id_key" ON "jira_worklog_syncs"("time_log_id");

-- CreateIndex
CREATE INDEX "jira_worklog_syncs_connection_id_idx" ON "jira_worklog_syncs"("connection_id");

-- CreateIndex
CREATE INDEX "jira_worklog_syncs_status_idx" ON "jira_worklog_syncs"("status");

-- CreateIndex
CREATE INDEX "jira_sync_logs_connection_id_idx" ON "jira_sync_logs"("connection_id");

-- CreateIndex
CREATE INDEX "jira_sync_logs_status_idx" ON "jira_sync_logs"("status");

-- CreateIndex
CREATE INDEX "jira_sync_logs_created_at_idx" ON "jira_sync_logs"("created_at");

-- AddForeignKey
ALTER TABLE "jira_connections" ADD CONSTRAINT "jira_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_project_mappings" ADD CONSTRAINT "jira_project_mappings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "jira_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_project_mappings" ADD CONSTRAINT "jira_project_mappings_chrono_project_id_fkey" FOREIGN KEY ("chrono_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_user_mappings" ADD CONSTRAINT "jira_user_mappings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "jira_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_user_mappings" ADD CONSTRAINT "jira_user_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_issue_cache" ADD CONSTRAINT "jira_issue_cache_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "jira_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_issue_cache" ADD CONSTRAINT "jira_issue_cache_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_worklog_syncs" ADD CONSTRAINT "jira_worklog_syncs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "jira_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_worklog_syncs" ADD CONSTRAINT "jira_worklog_syncs_time_log_id_fkey" FOREIGN KEY ("time_log_id") REFERENCES "time_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_sync_logs" ADD CONSTRAINT "jira_sync_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "jira_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
