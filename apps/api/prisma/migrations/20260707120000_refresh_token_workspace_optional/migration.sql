-- Allow refresh tokens for tenant operators who have not created a workspace yet.
ALTER TABLE "refresh_tokens" ALTER COLUMN "workspace_id" DROP NOT NULL;
