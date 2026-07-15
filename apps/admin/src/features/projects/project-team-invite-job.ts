import type { BulkInviteJobStatusDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";

export type PollBulkInviteJobApi = <T>(path: string, init: { workspaceId: string }) => Promise<T>;

export type WaitForBulkInviteJobOptions = {
  api: PollBulkInviteJobApi;
  workspaceId: string;
  projectId: string;
  jobId: string;
  intervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Poll until the bulk invite job completes or fails (or times out). */
export async function waitForBulkInviteJob(
  options: WaitForBulkInviteJobOptions
): Promise<BulkInviteJobStatusDto> {
  const {
    api,
    workspaceId,
    projectId,
    jobId,
    intervalMs = 1500,
    timeoutMs = 90_000,
    sleep = defaultSleep
  } = options;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const status = await api<BulkInviteJobStatusDto>(
      ROUTES.PROJECTS.TEAM_MEMBERS_BULK_JOB(projectId, jobId),
      { workspaceId }
    );
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    await sleep(intervalMs);
  }

  throw new Error("Invite is still processing. Refresh the team list in a moment.");
}

export function formatBulkInviteJobToast(status: BulkInviteJobStatusDto): {
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

  const { projectAddedCount, successCount, skippedCount } = status.result;
  const added = Math.max(projectAddedCount, successCount);
  if (skippedCount > 0 && added === 0) {
    return {
      tone: "warning",
      message: `No one was added (${skippedCount} skipped).`
    };
  }
  if (skippedCount > 0) {
    return {
      tone: "warning",
      message:
        added === 1
          ? `Added 1 person (${skippedCount} skipped).`
          : `Added ${added} people (${skippedCount} skipped).`
    };
  }
  return {
    tone: "success",
    message: added === 1 ? "Added 1 person to the team." : `Added ${added} people to the team.`
  };
}
