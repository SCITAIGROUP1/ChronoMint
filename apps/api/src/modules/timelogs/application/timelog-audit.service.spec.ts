import { describe, expect, it } from "vitest";
import { TimelogAuditService } from "./timelog-audit.service";

describe("TimelogAuditService", () => {
  const prisma = {};
  const service = new TimelogAuditService(
    prisma as any,
    {
      assertAllowed: async () => ({ allowed: true })
    } as any
  );

  it("snapshotFromLog captures required fields including classification", () => {
    const log = {
      taskId: "t1",
      classification: "PROJECT",
      startTime: new Date("2026-06-15T12:00:00Z"),
      endTime: new Date("2026-06-15T13:00:00Z"),
      durationSec: 3600,
      description: "test description",
      isBillable: true,
      source: "manual"
    };
    const snapshot = service.snapshotFromLog(log);
    expect(Object.keys(snapshot)).toHaveLength(8);
    expect(snapshot.taskId).toBe(log.taskId);
    expect(snapshot.classification).toBe("PROJECT");
    expect(snapshot.startTime).toBe(log.startTime.toISOString());
    expect(snapshot.endTime).toBe(log.endTime.toISOString());
    expect(snapshot.durationSec).toBe(log.durationSec);
    expect(snapshot.description).toBe(log.description);
    expect(snapshot.isBillable).toBe(log.isBillable);
    expect(snapshot.source).toBe(log.source);
  });
});
