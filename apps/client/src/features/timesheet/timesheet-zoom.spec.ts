import { describe, expect, it } from "vitest";
import {
  canZoomIn,
  canZoomOut,
  DEFAULT_TIMESHEET_SLOT_PX,
  parseTimesheetSlotPx,
  TIMESHEET_ZOOM_LEVELS,
  zoomInSlotPx,
  zoomOutSlotPx,
  zoomPercentLabel
} from "./timesheet-zoom";

describe("timesheet zoom", () => {
  it("defaults to 40px (100%)", () => {
    expect(DEFAULT_TIMESHEET_SLOT_PX).toBe(40);
    expect(zoomPercentLabel(DEFAULT_TIMESHEET_SLOT_PX)).toBe("100%");
  });

  it("steps through discrete levels", () => {
    expect(zoomInSlotPx(40)).toBe(52);
    expect(zoomOutSlotPx(40)).toBe(32);
    expect(zoomInSlotPx(TIMESHEET_ZOOM_LEVELS[TIMESHEET_ZOOM_LEVELS.length - 1]!)).toBe(
      TIMESHEET_ZOOM_LEVELS[TIMESHEET_ZOOM_LEVELS.length - 1]
    );
    expect(zoomOutSlotPx(TIMESHEET_ZOOM_LEVELS[0]!)).toBe(TIMESHEET_ZOOM_LEVELS[0]);
  });

  it("gates zoom buttons at the ends", () => {
    expect(canZoomOut(TIMESHEET_ZOOM_LEVELS[0]!)).toBe(false);
    expect(canZoomIn(TIMESHEET_ZOOM_LEVELS[0]!)).toBe(true);
    expect(canZoomIn(TIMESHEET_ZOOM_LEVELS[TIMESHEET_ZOOM_LEVELS.length - 1]!)).toBe(false);
  });

  it("parses stored slot heights", () => {
    expect(parseTimesheetSlotPx("52")).toBe(52);
    expect(parseTimesheetSlotPx("13")).toBeNull();
    expect(parseTimesheetSlotPx(null)).toBeNull();
  });
});
