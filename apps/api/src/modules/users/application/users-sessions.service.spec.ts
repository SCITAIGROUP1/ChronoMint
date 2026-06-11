import { describe, expect, it, vi, beforeEach } from "vitest";
import { UsersSessionsService } from "./users-sessions.service";

describe("UsersSessionsService", () => {
  let service: UsersSessionsService;
  let mockPrisma: any;
  let mockRevocation: { revokeFamily: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      refreshToken: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn()
      }
    };
    mockRevocation = { revokeFamily: vi.fn() };
    service = new UsersSessionsService(mockPrisma, mockRevocation as never);
  });

  it("lists active sessions for user", async () => {
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      {
        id: "session-1",
        tokenHash: "abc",
        userAgent: "Chrome",
        ipAddress: "127.0.0.1",
        lastUsedAt: new Date("2026-01-01T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        expiresAt: new Date("2026-01-08T00:00:00.000Z")
      }
    ]);

    const sessions = await service.listSessions("user-1");

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.userAgent).toBe("Chrome");
    expect(sessions[0]?.isCurrent).toBe(false);
  });

  it("revokes entire refresh family and blocks access immediately", async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      family: "fam-1"
    });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.revokeSession("user-1", "session-1");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", family: "fam-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    expect(mockRevocation.revokeFamily).toHaveBeenCalledWith("fam-1");
  });
});
