import { describe, expect, it } from "vitest";
import {
  addDurationToStartTime,
  applyDurationToDraft,
  durationSecFromStartEnd,
  formatDurationInput,
  parseDurationInput
} from "./parse-duration-input";

describe("parseDurationInput", () => {
  it("treats 2.5 and 2:30 as the same duration", () => {
    expect(parseDurationInput("2.5")).toBe(9000);
    expect(parseDurationInput("2:30")).toBe(9000);
    expect(parseDurationInput("2.5")).toBe(parseDurationInput("2:30"));
  });

  it("accepts comma as decimal separator", () => {
    expect(parseDurationInput("2,5")).toBe(9000);
  });

  it("treats bare integers as hours (Clockify-style)", () => {
    expect(parseDurationInput("2")).toBe(7200);
    expect(parseDurationInput("30")).toBe(30 * 3600);
  });

  it("parses fractional hours under one hour", () => {
    expect(parseDurationInput("0.75")).toBe(2700);
    expect(parseDurationInput(".75")).toBe(2700);
    expect(parseDurationInput("0:45")).toBe(2700);
  });

  it("rejects invalid clock minutes and garbage", () => {
    expect(parseDurationInput("2:60")).toBeNull();
    expect(parseDurationInput("abc")).toBeNull();
    expect(parseDurationInput("")).toBeNull();
    expect(parseDurationInput("  ")).toBeNull();
    expect(parseDurationInput("1:2")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseDurationInput("  2:30  ")).toBe(9000);
    expect(parseDurationInput(" 1.5 ")).toBe(5400);
  });
});

describe("formatDurationInput", () => {
  it("formats seconds as H:MM", () => {
    expect(formatDurationInput(9000)).toBe("2:30");
    expect(formatDurationInput(3600)).toBe("1:00");
    expect(formatDurationInput(2700)).toBe("0:45");
    expect(formatDurationInput(0)).toBe("0:00");
  });

  it("round-trips with parseDurationInput", () => {
    for (const raw of ["2.5", "2:30", "0.75", "1"]) {
      const sec = parseDurationInput(raw);
      expect(sec).not.toBeNull();
      expect(parseDurationInput(formatDurationInput(sec!))).toBe(sec);
    }
  });
});

describe("addDurationToStartTime", () => {
  it("adds duration to start", () => {
    expect(addDurationToStartTime("09:00", 9000)).toBe("11:30");
    expect(addDurationToStartTime("13:04", 3600)).toBe("14:04");
  });

  it("clamps end to 23:59 when duration would cross midnight", () => {
    expect(addDurationToStartTime("22:00", 3 * 3600)).toBe("23:59");
    expect(addDurationToStartTime("23:30", 3600)).toBe("23:59");
  });
});

describe("durationSecFromStartEnd", () => {
  it("returns positive duration between start and end", () => {
    expect(durationSecFromStartEnd("09:00", "11:30")).toBe(9000);
    expect(durationSecFromStartEnd("14:00", "13:00")).toBeNull();
  });
});

describe("applyDurationToDraft", () => {
  it("returns endTime from start + duration", () => {
    expect(applyDurationToDraft({ startTime: "10:00" }, 5400)).toEqual({ endTime: "11:30" });
  });
});
