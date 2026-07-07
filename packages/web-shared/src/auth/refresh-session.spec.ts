/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSetSession = vi.fn();
const mockGetAccessToken = vi.fn();
const mockGetRefreshToken = vi.fn();
const mockSchedule = vi.fn();

vi.mock("../stores/session.store", () => ({
  getAccessToken: () => mockGetAccessToken(),
  getRefreshToken: () => mockGetRefreshToken(),
  useSessionStore: {
    getState: () => ({
      accessToken: mockGetAccessToken(),
      setSession: mockSetSession
    })
  }
}));

vi.mock("../api/base", () => ({
  getApiBase: () => "http://localhost:3001"
}));

vi.mock("./token-scheduler", () => ({
  configureProactiveRefresh: vi.fn(),
  scheduleProactiveRefresh: (...args: unknown[]) => mockSchedule(...args)
}));

vi.mock("./jwt-payload", () => ({
  isAccessTokenExpired: (token: string | null) => token === "expired-token"
}));

describe("bootstrapTokenSchedulerFromStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetAccessToken.mockReset();
    mockGetRefreshToken.mockReset();
    mockSetSession.mockReset();
    mockSchedule.mockReset();
    mockGetRefreshToken.mockReturnValue("stored-refresh-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: "fresh-token", workspaceId: "ws-1" })
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("schedules proactive refresh for a valid stored token on load", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    const { bootstrapTokenSchedulerFromStorage } = await import("./refresh-session");
    bootstrapTokenSchedulerFromStorage();
    expect(mockSchedule).toHaveBeenCalledWith("valid-token");
  });

  it("attempts refresh immediately when stored token is expired", async () => {
    mockGetAccessToken.mockReturnValue("expired-token");
    const { bootstrapTokenSchedulerFromStorage } = await import("./refresh-session");
    bootstrapTokenSchedulerFromStorage();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3001/auth/refresh",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ refreshToken: "stored-refresh-token" })
        })
      );
      expect(mockSetSession).toHaveBeenCalled();
    });
  });
});
