import { describe, expect, it, vi, beforeEach } from "vitest";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;
  let mockPrisma: any;
  let mockAuth: any;

  const baseUser = {
    id: "user-1",
    email: "member@chronomint.dev",
    name: "Sam Rivera",
    passwordHash: "$2b$10$hashed",
    defaultHourlyRate: { toNumber: () => 100 },
    preferences: { dailyTargetHours: 6 },
    createdAt: new Date("2025-01-01T00:00:00.000Z")
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUniqueOrThrow: vi.fn(),
        update: vi.fn()
      },
      workspace: {
        findUniqueOrThrow: vi.fn()
      }
    };
    mockAuth = {
      revokeAllRefreshTokens: vi.fn()
    };
    service = new UsersService(mockPrisma, mockAuth);
  });

  it("returns profile with effective daily target from user preference", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      settings: { dailyTargetHours: 8 }
    });

    const profile = await service.getProfile("user-1", "ws-1");

    expect(profile.effectiveDailyTargetHours).toBe(6);
    expect(profile.preferences.dailyTargetHours).toBe(6);
    expect(profile.defaultHourlyRate).toBe(100);
  });

  it("falls back to workspace daily target when user preference unset", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ ...baseUser, preferences: {} });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      settings: { dailyTargetHours: 7 }
    });

    const profile = await service.getProfile("user-1", "ws-1");
    expect(profile.effectiveDailyTargetHours).toBe(7);
  });

  it("merges preferences on update", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    mockPrisma.user.update.mockResolvedValue({
      ...baseUser,
      preferences: { dailyTargetHours: 5, timezone: "America/New_York" }
    });
    mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ws-1",
      settings: {}
    });

    const profile = await service.updatePreferences("user-1", "ws-1", {
      timezone: "America/New_York"
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: {
          preferences: {
            dailyTargetHours: 6,
            timezone: "America/New_York"
          }
        },
        select: expect.objectContaining({ preferences: true })
      })
    );
    expect(profile.preferences.timezone).toBe("America/New_York");
  });
});
