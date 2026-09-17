import { describe, expect, it } from "vitest";
import {
  appBarActionButtonVariants,
  appBarIconButtonVariants,
  widgetShellVariants
} from "./shell-styles.js";

describe("shell-styles", () => {
  it("applies active app bar action classes", () => {
    expect(appBarActionButtonVariants({ active: true })).toContain("border-primary/30");
  });

  it("applies editing widget shell classes", () => {
    expect(widgetShellVariants({ editing: true })).toContain("ring-primary/30");
  });

  it("keeps icon button sizing consistent with sidebar brand mark", () => {
    expect(appBarIconButtonVariants()).toContain("h-10 w-10");
    expect(appBarIconButtonVariants()).toContain("rounded-xl");
  });
});

describe("shell density tokens", () => {
  it("does not inflate AppBar padding from a width container query", async () => {
    const { shellAppBarClass, shellAppBarTitleClass, shellHeaderBandYClass, shellInsetXClass } =
      await import("./shell-styles.js");
    expect(shellHeaderBandYClass).toBe("py-3");
    expect(shellHeaderBandYClass).not.toContain("py-5");
    expect(shellAppBarTitleClass).toContain("text-xl");
    expect(shellAppBarTitleClass).not.toContain("text-2xl");
    expect(shellAppBarClass).toContain("mb-0");
    expect(shellInsetXClass).toContain("@min-[1101px]/shell:px-6");
    expect(shellInsetXClass).not.toContain("lg:px-8");
  });
});
