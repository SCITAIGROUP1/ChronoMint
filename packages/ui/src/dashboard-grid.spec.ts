import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesheetPath = join(dirname(fileURLToPath(import.meta.url)), "dashboard-grid.css");
const css = readFileSync(stylesheetPath, "utf8");
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("dashboard grid stylesheet", () => {
  it("owns the shared react-grid-layout customization selectors", () => {
    expect(css).toContain(".react-grid-placeholder");
    expect(css).toContain(".layout-customizing .react-grid-item");
    expect(css).toContain(".react-resizable-handle-s");
    expect(css).toContain(".react-resizable-handle-e");
    expect(css).toContain(".react-resizable-handle-se");
  });

  it("uses semantic tokens through OKLCH-compatible color mixing", () => {
    expect(css).toContain("color-mix(in oklch, var(--primary)");
    expect(css).toContain("color-mix(in oklch, var(--foreground)");
    expect(css).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|#[\da-f]{3,8})\s*\(/i);
    expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
  });

  it("does not override theme modes with color literals", () => {
    expect(css).not.toContain(".dark");
    expect(css).not.toContain(":root");
    expect(css).not.toContain("@media (prefers-color-scheme");
  });

  it("is exported for explicit imports and included by package globals", () => {
    const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      exports: Record<string, string>;
    };
    const globals = readFileSync(join(packageRoot, "src/globals.css"), "utf8");

    expect(packageJson.exports["./dashboard-grid.css"]).toBe("./src/dashboard-grid.css");
    expect(globals).toContain('@import "./dashboard-grid.css";');
  });
});
