-- CreateTable
CREATE TABLE "jira_connections" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "cloud_id" TEXT NOT NULL,
    "site_url" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "connected_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_project_mappings" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "jira_project_key" TEXT NOT NULL,
    "chronomint_project_id" TEXT NOT NULL,
    "auto_create_tasks" BOOLEAN NOT NULL DEFAULT true,
    "default_category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_project_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_issue_links" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "jira_issue_key" TEXT NOT NULL,
    "jira_issue_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_issue_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_access_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jira_connections_workspace_id_key" ON "jira_connections"("workspace_id");

-- CreateIndex
CREATE INDEX "jira_project_mappings_workspace_id_idx" ON "jira_project_mappings"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_project_mappings_workspace_id_jira_project_key_key" ON "jira_project_mappings"("workspace_id", "jira_project_key");

-- CreateIndex
CREATE INDEX "jira_issue_links_workspace_id_idx" ON "jira_issue_links"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_issue_links_task_id_key" ON "jira_issue_links"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_issue_links_workspace_id_jira_issue_key_key" ON "jira_issue_links"("workspace_id", "jira_issue_key");

-- CreateIndex
CREATE UNIQUE INDEX "personal_access_tokens_token_hash_key" ON "personal_access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "personal_access_tokens_user_id_workspace_id_idx" ON "personal_access_tokens"("user_id", "workspace_id");

-- AddForeignKey
ALTER TABLE "jira_connections" ADD CONSTRAINT "jira_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_connections" ADD CONSTRAINT "jira_connections_connected_by_id_fkey" FOREIGN KEY ("connected_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_project_mappings" ADD CONSTRAINT "jira_project_mappings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_project_mappings" ADD CONSTRAINT "jira_project_mappings_chronomint_project_id_fkey" FOREIGN KEY ("chronomint_project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_project_mappings" ADD CONSTRAINT "jira_project_mappings_default_category_id_fkey" FOREIGN KEY ("default_category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_issue_links" ADD CONSTRAINT "jira_issue_links_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_issue_links" ADD CONSTRAINT "jira_issue_links_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
