import { describe, expect, it } from "vitest";

/** Mirrors buildScopedQueryKey day normalization used by useMySubmissions. */
function buildScopedQueryKey(anchorDate: Date, scope: "logged" | "assigned") {
  return `date=${anchorDate.toISOString().slice(0, 10)}&scope=${scope}`;
}

describe("member submissions query key stability", () => {
  it("uses the same day key for different times on the same UTC day", () => {
    const morning = new Date("2026-07-08T08:00:00.000Z");
    const evening = new Date("2026-07-08T20:15:30.500Z");
    expect(buildScopedQueryKey(morning, "assigned")).toBe(buildScopedQueryKey(evening, "assigned"));
    expect(buildScopedQueryKey(morning, "assigned")).toBe("date=2026-07-08&scope=assigned");
  });
});
