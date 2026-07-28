import { describe, expect, it } from "vitest";
import {
  descriptionLineClampStyle,
  estimateDescriptionLineClamp,
  linesForContainerHeight
} from "./description-line-clamp";

describe("estimateDescriptionLineClamp", () => {
  it("uses a single line for short entries", () => {
    expect(estimateDescriptionLineClamp(600)).toBe(1);
  });

  it("grows with entry duration so tall blocks show more text", () => {
    const hour = estimateDescriptionLineClamp(3600, {
      compact: true,
      hasProject: true,
      hasCategoryRow: true
    });
    const tall = estimateDescriptionLineClamp(9900, {
      compact: true,
      hasProject: true,
      hasCategoryRow: true
    });
    expect(hour).toBeGreaterThan(1);
    expect(tall).toBeGreaterThan(hour);
  });
});

describe("linesForContainerHeight", () => {
  it("floors available height into whole lines", () => {
    expect(linesForContainerHeight(48, 12)).toBe(4);
    expect(linesForContainerHeight(10, 12)).toBe(1);
  });
});

describe("descriptionLineClampStyle", () => {
  it("applies webkit line clamp for dynamic ellipsis", () => {
    expect(descriptionLineClampStyle(5)).toMatchObject({
      display: "-webkit-box",
      WebkitLineClamp: 5,
      overflow: "hidden"
    });
  });
});
