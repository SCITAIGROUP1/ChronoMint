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
  it("registers the restored widgets once with visible defaults", () => {
    for (const id of RESTORED_PERSONAL_IDS) {
      const definitions = WIDGET_REGISTRY.filter((widget) => widget.id === id);
      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toMatchObject({ scope: "personal", defaultVisible: true });
      expect(DEFAULT_LAYOUT.find((item) => item.i === id)?.visible).toBe(true);
    }
  });
});
