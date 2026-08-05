import { describe, expect, it } from "vitest";
import { isTimeEntryInactive } from "./entry-approval-status";

describe("isTimeEntryInactive", () => {
  it("keeps entries read-only when any catalog parent is inactive", () => {
    expect(isTimeEntryInactive({ isActive: false } as never, undefined, undefined)).toBe(true);
    expect(isTimeEntryInactive(undefined, { isActive: false } as never, undefined)).toBe(true);
    expect(isTimeEntryInactive(undefined, undefined, { isActive: false } as never)).toBe(true);
  });

  it("allows entries whose catalog entities are active", () => {
    expect(
      isTimeEntryInactive(
        { isActive: true } as never,
        { isActive: true } as never,
        { isActive: true } as never
      )
    ).toBe(false);
  });
});
