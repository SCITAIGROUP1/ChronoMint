import { beforeEach, describe, expect, it, vi } from "vitest";
import { JiraAuthService } from "./jira-auth.service";

type AnyMock = ReturnType<typeof vi.fn>;

function makePrisma() {
  return {
    jiraConnection: {
      findUnique: vi.fn() as AnyMock,
      upsert: vi.fn() as AnyMock,
      update: vi.fn() as AnyMock,
      delete: vi.fn() as AnyMock
    }
  };
}

function makeJwt() {
  return {
    sign: vi.fn(() => "signed-state-token") as AnyMock,
    verify: vi.fn() as AnyMock
  };
}

describe("JiraAuthService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let jwt: ReturnType<typeof makeJwt>;
  let service: JiraAuthService;

  beforeEach(() => {
    prisma = makePrisma();
    jwt = makeJwt();
    service = new JiraAuthService(prisma as any, jwt as any);
  });

  describe("getAuthUrl", () => {
    it("returns an Atlassian authorize URL", () => {
      const { authUrl } = service.getAuthUrl("ws-1");
      expect(authUrl).toContain("https://auth.atlassian.com/authorize");
    });

    it("includes the JWT-signed state parameter", () => {
      const { authUrl } = service.getAuthUrl("ws-1");
      expect(jwt.sign).toHaveBeenCalledWith({ workspaceId: "ws-1" }, { expiresIn: "10m" });
      expect(authUrl).toContain("state=signed-state-token");
    });

    it("requests offline_access for refresh token support", () => {
      const { authUrl } = service.getAuthUrl("ws-1");
      expect(authUrl).toContain("offline_access");
    });
  });

  describe("getStatus", () => {
    it("returns connected:false when no connection exists", async () => {
      prisma.jiraConnection.findUnique.mockResolvedValue(null);
      const result = await service.getStatus("ws-1");
      expect(result).toEqual({ connected: false });
    });

    it("returns connection details when connected", async () => {
      const now = new Date("2026-06-12T00:00:00.000Z");
      prisma.jiraConnection.findUnique.mockResolvedValue({
        siteUrl: "https://kloqra-test.atlassian.net",
        siteName: "Kloqra Test",
        email: "amrithagz123@gmail.com",
        isActive: true,
        lastSyncAt: null,
        createdAt: now
      });
      const result = await service.getStatus("ws-1");
      expect(result).toMatchObject({
        connected: true,
        siteName: "Kloqra Test",
        email: "amrithagz123@gmail.com",
        isActive: true,
        connectedAt: now
      });
    });
  });

  describe("getValidToken", () => {
    it("throws NOT_FOUND when workspace has no active connection", async () => {
      prisma.jiraConnection.findUnique.mockResolvedValue(null);
      await expect(service.getValidToken("ws-1")).rejects.toThrow(/not connected/i);
    });

    it("throws NOT_FOUND when connection is inactive", async () => {
      prisma.jiraConnection.findUnique.mockResolvedValue({
        id: "conn-1",
        accessToken: "tok",
        cloudId: "cloud-1",
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: false
      });
      await expect(service.getValidToken("ws-1")).rejects.toThrow(/not connected/i);
    });

    it("returns token and cloudId when token is still valid", async () => {
      prisma.jiraConnection.findUnique.mockResolvedValue({
        id: "conn-1",
        accessToken: "valid-token",
        cloudId: "cloud-abc",
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true
      });
      const result = await service.getValidToken("ws-1");
      expect(result).toEqual({ token: "valid-token", cloudId: "cloud-abc" });
    });
  });

  describe("disconnect", () => {
    it("returns ok:true immediately when no connection exists", async () => {
      prisma.jiraConnection.findUnique.mockResolvedValue(null);
      const result = await service.disconnect("ws-1");
      expect(result).toEqual({ ok: true });
      expect(prisma.jiraConnection.delete).not.toHaveBeenCalled();
    });

    it("deletes the connection row after best-effort token revocation", async () => {
      prisma.jiraConnection.findUnique.mockResolvedValue({
        id: "conn-1",
        accessToken: "tok"
      });
      prisma.jiraConnection.delete.mockResolvedValue({});
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

      const result = await service.disconnect("ws-1");
      expect(result).toEqual({ ok: true });
      expect(prisma.jiraConnection.delete).toHaveBeenCalledWith({ where: { workspaceId: "ws-1" } });

      vi.unstubAllGlobals();
    });
  });
});
