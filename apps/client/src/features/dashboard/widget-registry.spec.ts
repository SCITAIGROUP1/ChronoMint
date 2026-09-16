import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT, WIDGET_REGISTRY } from "./widget-registry";

const RESTORED_PERSONAL_IDS = [
  "personal_category_split",
  "personal_project_split",
  "personal_weekly_progress",
  "personal_quick_timer",
  "personal_today_logs"
];

describe("personal dashboard registry", () => {
  it("registers personal widgets with default visibility from the member overview", () => {
    for (const id of RESTORED_PERSONAL_IDS) {
      const definitions = WIDGET_REGISTRY.filter((widget) => widget.id === id);
      expect(definitions).toHaveLength(1);
      expect(definitions[0]?.scope).toBe("personal");
    }
    expect(DEFAULT_LAYOUT.find((item) => item.i === "personal_today_logs")?.visible).toBe(false);
    expect(DEFAULT_LAYOUT.find((item) => item.i === "personal_category_split")).toMatchObject({
      x: 6,
      y: 6,
      w: 6,
      h: 3,
      visible: true
    });
  });
});
