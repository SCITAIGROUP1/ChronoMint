import { presenceSnapshotSchema } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PresenceService } from "./presence.service";

function createRedisMock() {
  const store = new Map<string, string>();
  const client = {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    duplicate: vi.fn(() => ({
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined)
    }))
  };
  return { store, client, redis: { getClient: () => client } };
}

describe("PresenceService", () => {
  let service: PresenceService;
  let redisMock: ReturnType<typeof createRedisMock>;
  let mockPrisma: {
    workspaceMember: { findMany: ReturnType<typeof vi.fn> };
    task: { findMany: ReturnType<typeof vi.fn> };
  };

  const workspaceId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const taskId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    redisMock = createRedisMock();
    mockPrisma = {
      workspaceMember: { findMany: vi.fn() },
      task: { findMany: vi.fn() }
    };
    service = new PresenceService(mockPrisma as never, redisMock.redis as never);
  });

  it("AC-1: snapshot matches PresenceSnapshotDto when Redis has active timer", async () => {
    mockPrisma.workspaceMember.findMany.mockResolvedValue([
      { userId, user: { name: "Member User" } }
    ]);
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({
        taskId,
        startedAt: "2025-06-01T09:00:00.000Z",
        isPaused: false
      })
    );
    mockPrisma.task.findMany.mockResolvedValue([
      {
        id: taskId,
        taskName: "Design review",
        project: { name: "Website" }
      }
    ]);

    const snapshot = await service.snapshot(workspaceId);

    expect(presenceSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(snapshot.members).toHaveLength(1);
    expect(snapshot.members[0]).toMatchObject({
      userId,
      userName: "Member User",
      taskId,
      taskName: "Design review",
      projectName: "Website",
      startedAt: "2025-06-01T09:00:00.000Z",
      isPaused: false
    });
    expect(typeof snapshot.updatedAt).toBe("string");
  });

  it("AC-2: returns empty members array when no active timers", async () => {
    mockPrisma.workspaceMember.findMany.mockResolvedValue([
      { userId, user: { name: "Idle User" } }
    ]);

    const snapshot = await service.snapshot(workspaceId);

    expect(snapshot.members).toEqual([]);
    expect(Array.isArray(snapshot.members)).toBe(true);
    expect(snapshot.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
  });

  it("AC-3: omits timer when task no longer exists (invalid task reference)", async () => {
    mockPrisma.workspaceMember.findMany.mockResolvedValue([
      { userId, user: { name: "Member User" } }
    ]);
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({
        taskId: "44444444-4444-4444-8444-444444444444",
        startedAt: "2025-06-01T09:00:00.000Z"
      })
    );
    mockPrisma.task.findMany.mockResolvedValue([]);

    const snapshot = await service.snapshot(workspaceId);

    expect(snapshot.members).toEqual([]);
    expect(presenceSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });
});
