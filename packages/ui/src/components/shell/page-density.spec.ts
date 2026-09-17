import { describe, expect, it } from "vitest";
import {
  compactCardClass,
  controlHeightClass,
  appBarPageActionClass,
  dataTableCardFillClass,
  dataTableMetaColClass,
  dataTablePaginationClass,
  dataTableStickyColClass,
  pageAppBarClass,
  pageBodyClass,
  pageLayoutClass,
  pageMainClass,
  statStripClass
} from "./page-density.js";

describe("page-density", () => {
  it("uses a fill flex column instead of stacked page air", () => {
    expect(pageLayoutClass).toContain("flex-1");
    expect(pageLayoutClass).toContain("flex-col");
    expect(pageBodyClass).toContain("gap-4");
    expect(pageBodyClass).not.toContain("space-y-10");
    expect(pageLayoutClass).toContain("gap-4");
    expect(pageMainClass).toContain("min-h-0");
    expect(pageMainClass).toContain("flex-1");
  });

  it("keeps chrome from eating leftover height", () => {
    expect(pageAppBarClass).toContain("mb-0");
    expect(statStripClass).toContain("shrink-0");
    expect(statStripClass).toContain("overflow-x-auto");
    expect(dataTableCardFillClass).toContain("flex-1");
    expect(dataTableCardFillClass).toContain("min-h-0");
    expect(dataTablePaginationClass).toContain("shrink-0");
    expect(dataTableMetaColClass).toContain("hidden");
    expect(dataTableMetaColClass).toContain("@min-[960px]/shell:table-cell");
    expect(dataTableStickyColClass).toContain("sticky");
  });

  it("uses one toolbar control height", () => {
    expect(controlHeightClass).toBe("h-10");
    expect(appBarPageActionClass).toContain("h-10");
    expect(appBarPageActionClass).toContain("shrink-0");
    expect(appBarPageActionClass).toContain("gap-2");
  });

  it("compacts nested cards", () => {
    expect(compactCardClass).toContain("gap-0");
    expect(compactCardClass).toContain("py-0");
  });
});
