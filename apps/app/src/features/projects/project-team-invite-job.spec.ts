import { describe, expect, it, vi } from "vitest";
import { formatBulkInviteJobToast, waitForBulkInviteJob } from "./project-team-invite-job";

describe("formatBulkInviteJobToast", () => {
  it("formats failed jobs", () => {
    expect(
      formatBulkInviteJobToast({
        jobId: "j1",
        status: "failed",
        failedReason: "Seat limit reached"
      })
    ).toEqual({ tone: "error", message: "Seat limit reached" });
  });

  it("formats completed jobs with skips", () => {
    expect(
      formatBulkInviteJobToast({
        jobId: "j1",
        status: "completed",
        result: {
          successCount: 1,
          skippedCount: 2,
          projectAddedCount: 1,
          totalProcessed: 3
        }
      })
    ).toEqual({ tone: "warning", message: "Added 1 person (2 skipped)." });
  });

  it("formats clean completions", () => {
    expect(
      formatBulkInviteJobToast({
        jobId: "j1",
        status: "completed",
        result: {
          successCount: 0,
          skippedCount: 0,
          projectAddedCount: 3,
          totalProcessed: 3
        }
      })
    ).toEqual({ tone: "success", message: "Added 3 people to the team." });
  });
});

describe("waitForBulkInviteJob", () => {
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
          projectAddedCount: 1,
          totalProcessed: 1
        }
      });
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await waitForBulkInviteJob({
      api,
      workspaceId: "ws-1",
      projectId: "proj-1",
      jobId: "j1",
      intervalMs: 1,
      sleep
    });

    expect(result.status).toBe("completed");
    expect(api).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("times out while still queued", async () => {
    const api = vi.fn().mockResolvedValue({ jobId: "j1", status: "active" });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      waitForBulkInviteJob({
        api,
        workspaceId: "ws-1",
        projectId: "proj-1",
        jobId: "j1",
        intervalMs: 1,
        timeoutMs: 5,
        sleep
      })
    ).rejects.toThrow(/still processing/i);
  });
});
