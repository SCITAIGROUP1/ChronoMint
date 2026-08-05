import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("allows internal product routes", () => {
    expect(safeNextPath("/invite/token-1")).toBe("/invite/token-1");
    expect(safeNextPath("/projects/p-1?tab=tasks")).toBe("/projects/p-1?tab=tasks");
  });

  it("rejects external and malformed redirects", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("dashboard")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
