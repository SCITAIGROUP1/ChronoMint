import { describe, expect, it } from "vitest";
import {
  calendarEntryChromeClass,
  calendarEntryContentPaddingClass,
  entryTimesChanged,
  HAIRLINE_ENTRY_SEC,
  shouldCommitResize,
  slotProportion
} from "./calendar-entry-chrome";
import { blockStyle, combineDayAndTimeInZone, SLOT_MINUTES } from "./calendar-utils";
import { SHORT_ENTRY_SEC } from "./description-line-clamp";

describe("slotProportion", () => {
  it("maps 6 minutes to exactly 1/5 of a 30-minute slot", () => {
    expect(slotProportion(6)).toBeCloseTo(1 / 5, 10);
    expect(SLOT_MINUTES).toBe(30);
  });

  it("maps 30 minutes to a full slot", () => {
    expect(slotProportion(30)).toBe(1);
  });
});

describe("blockStyle vs slot proportion for short entries", () => {
  it("gives a 6-minute entry height equal to 1/5 of one slot's share of the day", () => {
    const start = combineDayAndTimeInZone("2026-06-08", "09:00", "UTC");
    const end = combineDayAndTimeInZone("2026-06-08", "09:06", "UTC");
    const style = blockStyle(start, end, "UTC");
    const heightPct = parseFloat(style.height);
    const slotShareOfDay = (SLOT_MINUTES / (24 * 60)) * 100;
    expect(heightPct).toBeCloseTo(slotShareOfDay * slotProportion(6), 5);
  });
});

describe("calendarEntryChromeClass", () => {
  it("uses a thin left accent for short entries (no full box border)", () => {
    const cls = calendarEntryChromeClass(6 * 60);
    expect(cls).toContain("border-l");
    expect(cls.split(/\s+/).includes("border")).toBe(false);
  });

  it("avoids full box borders for normal entries so height stays proportional", () => {
    const cls = calendarEntryChromeClass(SHORT_ENTRY_SEC);
    expect(cls).toContain("border-l-2");
    expect(cls.split(/\s+/).includes("border")).toBe(false);
  });

  it("keeps dashed/dotted borders only for locked/timer states", () => {
    expect(calendarEntryChromeClass(HAIRLINE_ENTRY_SEC, { dashed: true })).toContain(
      "border-dashed"
    );
    expect(calendarEntryChromeClass(HAIRLINE_ENTRY_SEC, { dotted: true })).toContain(
      "border-dotted"
    );
  });
});

describe("calendarEntryContentPaddingClass", () => {
  it("tightens padding for short entries", () => {
    expect(calendarEntryContentPaddingClass(6 * 60)).toBe("px-1 py-0");
    expect(calendarEntryContentPaddingClass(30 * 60)).toBe("px-1.5 py-0.5");
  });
});

describe("shouldCommitResize", () => {
  const originStart = new Date("2026-08-05T13:00:00.000Z");
  const originEnd = new Date("2026-08-05T14:00:00.000Z");

  it("ignores a bare click on the resize handle", () => {
    expect(
      shouldCommitResize({
        moved: false,
        originStart,
        originEnd,
        previewStart: originStart,
        previewEnd: originEnd
      })
    ).toBe(false);
  });

  it("ignores a drag that snaps back to the same times", () => {
    expect(
      shouldCommitResize({
        moved: true,
        originStart,
        originEnd,
        previewStart: originStart,
        previewEnd: originEnd
      })
    ).toBe(false);
  });

  it("commits when the edge actually moved", () => {
    expect(
      shouldCommitResize({
        moved: true,
        originStart,
        originEnd,
        previewStart: originStart,
        previewEnd: new Date("2026-08-05T14:30:00.000Z")
      })
    ).toBe(true);
  });
});

describe("entryTimesChanged", () => {
  it("returns false when times match the log", () => {
    expect(
      entryTimesChanged(
        { startTime: "2026-08-05T13:00:00.000Z", endTime: "2026-08-05T14:00:00.000Z" },
        new Date("2026-08-05T13:00:00.000Z"),
        new Date("2026-08-05T14:00:00.000Z")
      )
    ).toBe(false);
  });
});
