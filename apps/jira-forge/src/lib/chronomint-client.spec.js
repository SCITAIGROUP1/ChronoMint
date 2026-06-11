import { describe, expect, it, vi } from "vitest";
import { chronomintFetch } from "./chronomint-client.js";

describe("chronomintFetch", () => {
  it("throws when config is incomplete", async () => {
    const api = { fetch: vi.fn() };
    await expect(chronomintFetch(api, {}, "/timer/active")).rejects.toThrow(/not configured/);
  });

  it("sends PAT and workspace headers", async () => {
    const api = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ taskId: "t1" })
      })
    };

    await chronomintFetch(
      api,
      {
        apiBaseUrl: "http://localhost:3001",
        workspaceId: "ws-1",
        pat: "klo_pat_test"
      },
      "/timer/start",
      { method: "POST", body: { taskId: "t1" } }
    );

    expect(api.fetch).toHaveBeenCalledWith(
      "http://localhost:3001/timer/start",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer klo_pat_test",
          "X-Workspace-Id": "ws-1"
        })
      })
    );
  });
});
