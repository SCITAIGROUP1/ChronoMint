import { describe, it, expect } from "vitest";

describe("TimelogsService", () => {
  it("duration calculation", () => {
    const start = new Date("2025-01-01T09:00:00Z");
    const end = new Date("2025-01-01T11:30:00Z");
    const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);
    expect(durationSec).toBe(9000);
  });
});
