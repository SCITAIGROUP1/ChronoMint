import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_COLOR,
  pickDefaultProjectColor,
  projectColorsMatch,
  PROJECT_COLORS
} from "./project-colors";

describe("project-colors", () => {
  it("exposes a default color from the palette", () => {
    expect(DEFAULT_PROJECT_COLOR).toBe(PROJECT_COLORS[0]);
  });

  it("cycles palette colors by index", () => {
    expect(pickDefaultProjectColor(0)).toBe(PROJECT_COLORS[0]);
    expect(pickDefaultProjectColor(PROJECT_COLORS.length)).toBe(PROJECT_COLORS[0]);
  });

  it("compares colors case-insensitively with trimming", () => {
    expect(projectColorsMatch(" #FF00AA ", "#ff00aa")).toBe(true);
    expect(projectColorsMatch("#ff00aa", "#00ff00")).toBe(false);
  });
});
