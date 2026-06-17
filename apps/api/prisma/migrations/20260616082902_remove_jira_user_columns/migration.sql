/*
  Warnings:

  - You are about to drop the column `jira_api_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `jira_site_url` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "jira_api_token",
DROP COLUMN "jira_site_url";
