import type { BulkInviteJobStatusDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";

export type PollBulkInviteJobApi = <T>(path: string, init: { workspaceId: string }) => Promise<T>;

export type WaitForWorkspaceBulkInviteJobOptions = {
  api: PollBulkInviteJobApi;
  workspaceId: string;
  jobId: string;
  intervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Poll until the workspace bulk invite job completes or fails (or times out). */
export async function waitForWorkspaceBulkInviteJob(
  options: WaitForWorkspaceBulkInviteJobOptions
): Promise<BulkInviteJobStatusDto> {
  const {
    api,
    workspaceId,
    jobId,
    intervalMs = 1500,
    timeoutMs = 90_000,
    sleep = defaultSleep
  } = options;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const status = await api<BulkInviteJobStatusDto>(
      ROUTES.WORKSPACES.BULK_MEMBERS_JOB(workspaceId, jobId),
      { workspaceId }
    );
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    await sleep(intervalMs);
  }

  throw new Error("Invite is still processing. Refresh the team list in a moment.");
}

export function formatWorkspaceBulkInviteJobToast(status: BulkInviteJobStatusDto): {
  tone: "success" | "warning" | "error";
  message: string;
} {
  if (status.status === "failed") {
    return {
      tone: "error",
      message: status.failedReason?.trim() || "Invite failed. Try again."
    };
  }
  if (status.status !== "completed" || !status.result) {
    return { tone: "success", message: "Invite finished." };
  }

  const {
    successCount,
    skippedCount,
    emailQueuedCount = 0,
    credentialsResentCount = 0,
    emailFailedCount = 0
  } = status.result;

  if (successCount === 0 && credentialsResentCount === 0 && skippedCount > 0) {
    return {
      tone: "warning",
      message: `No new members added (${skippedCount} skipped).`
    };
  }

  const parts: string[] = [];
  if (successCount > 0) {
    parts.push(successCount === 1 ? "Added 1 member" : `Added ${successCount} members`);
  }
  if (credentialsResentCount > 0) {
    parts.push(
      credentialsResentCount === 1
        ? "resent 1 sign-in email"
        : `resent ${credentialsResentCount} sign-in emails`
    );
  }
  if (emailQueuedCount > 0 && credentialsResentCount === 0) {
    parts.push(emailQueuedCount === 1 ? "1 email queued" : `${emailQueuedCount} emails queued`);
  }
  if (skippedCount > 0) {
    parts.push(`${skippedCount} skipped`);
  }
  if (emailFailedCount > 0) {
    parts.push(`${emailFailedCount} email enqueue failed`);
  }

  const message = parts.length ? `${parts.join("; ")}.` : "Invite finished.";
  const tone =
    emailFailedCount > 0 || skippedCount > 0 || credentialsResentCount > 0 ? "warning" : "success";
  return { tone, message };
}
