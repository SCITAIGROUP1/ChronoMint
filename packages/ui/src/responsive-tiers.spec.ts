import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMPACT_LAPTOP_SHELL_MAX,
  COMPACT_LAPTOP_SHELL_MIN,
  COMPACT_LAPTOP_VIEWPORT,
  COMPACT_LAPTOP_VIEWPORT_MAX,
  COMFORTABLE_DESKTOP_SHELL_MIN,
  EXPORT_TWO_COLUMN_SHELL_MIN,
  SIDEBAR_COLLAPSED_STORAGE_KEY
} from "./responsive-tiers.js";

const globalsPath = join(dirname(fileURLToPath(import.meta.url)), "globals.css");
const globals = readFileSync(globalsPath, "utf8");

describe("responsive tiers", () => {
  it("defines ordered, non-overlapping shell width tiers", () => {
    expect(COMPACT_LAPTOP_SHELL_MIN).toBeLessThan(COMPACT_LAPTOP_SHELL_MAX);
    expect(COMFORTABLE_DESKTOP_SHELL_MIN).toBeGreaterThan(COMPACT_LAPTOP_SHELL_MAX);
    expect(EXPORT_TWO_COLUMN_SHELL_MIN).toBeGreaterThan(COMFORTABLE_DESKTOP_SHELL_MIN);
  });

  it("keeps the compact QA viewport below the sidebar collapse threshold", () => {
    expect(COMPACT_LAPTOP_VIEWPORT).toEqual({ width: 1366, height: 768 });
    expect(COMPACT_LAPTOP_VIEWPORT.width).toBeLessThan(COMPACT_LAPTOP_VIEWPORT_MAX);
  });

  it("centralizes the persisted sidebar preference key", () => {
    expect(SIDEBAR_COLLAPSED_STORAGE_KEY).toBe("kloqra-sidebar-collapsed");
  });

  it("keeps CSS shell tier tokens aligned with TypeScript constants", () => {
    expect(globals).toContain(`--shell-compact-min: ${COMPACT_LAPTOP_SHELL_MIN}px`);
    expect(globals).toContain(`--shell-compact-max: ${COMPACT_LAPTOP_SHELL_MAX}px`);
    expect(globals).toContain(`--shell-comfortable-min: ${COMFORTABLE_DESKTOP_SHELL_MIN}px`);
  });
});
