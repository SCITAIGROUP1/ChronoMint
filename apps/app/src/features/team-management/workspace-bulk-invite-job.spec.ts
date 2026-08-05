import { describe, expect, it, vi } from "vitest";
import {
  formatWorkspaceBulkInviteJobToast,
  waitForWorkspaceBulkInviteJob
} from "./workspace-bulk-invite-job";

describe("formatWorkspaceBulkInviteJobToast", () => {
  it("summarizes successes, skips, and email failures", () => {
    expect(
      formatWorkspaceBulkInviteJobToast({
        jobId: "j1",
        status: "completed",
        result: {
          successCount: 2,
          skippedCount: 1,
          projectAddedCount: 0,
          totalProcessed: 3,
          emailQueuedCount: 2,
          credentialsResentCount: 0,
          emailFailedCount: 1
        }
      })
    ).toEqual({
      tone: "warning",
      message: "Added 2 members; 2 emails queued; 1 skipped; 1 email enqueue failed."
    });
  });

  it("reports credentials resends", () => {
    expect(
      formatWorkspaceBulkInviteJobToast({
        jobId: "j1",
        status: "completed",
        result: {
          successCount: 0,
          skippedCount: 0,
          projectAddedCount: 0,
          totalProcessed: 1,
          emailQueuedCount: 1,
          credentialsResentCount: 1,
          emailFailedCount: 0
        }
      })
    ).toEqual({
      tone: "warning",
      message: "resent 1 sign-in email."
    });
  });
});

describe("waitForWorkspaceBulkInviteJob", () => {
  it("returns when the job completes", async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce({ jobId: "j1", status: "queued" })
      .mockResolvedValueOnce({
        jobId: "j1",
        status: "completed",
        result: {
          successCount: 1,
          skippedCount: 0,
          projectAddedCount: 0,
          totalProcessed: 1,
          emailQueuedCount: 1,
          credentialsResentCount: 0,
          emailFailedCount: 0
        }
      });

    const status = await waitForWorkspaceBulkInviteJob({
      api,
      workspaceId: "ws-1",
      jobId: "j1",
      intervalMs: 1,
      sleep: async () => undefined
    });

    expect(status.status).toBe("completed");
    expect(api).toHaveBeenCalledTimes(2);
  });
});
