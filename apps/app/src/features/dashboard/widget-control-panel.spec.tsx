// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetControlPanel } from "./widget-control-panel";
import type { WidgetDefinition } from "./widget-registry";

const widgets: WidgetDefinition[] = [
  {
    id: "personal_today",
    label: "My Time Today",
    description: "Personal time",
    scope: "personal",
    group: "kpi",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    defaultVisible: true,
    iconName: "Clock"
  },
  {
    id: "team_utilization",
    label: "Team Utilization",
    description: "Management utilization",
    scope: "management",
    group: "team",
    defaultSize: { w: 5, h: 5 },
    minSize: { w: 4, h: 4 },
    defaultVisible: true,
    iconName: "Users"
  }
];

describe("WidgetControlPanel", () => {
  afterEach(cleanup);

  it("filters one combined catalog by personal and management scope", () => {
    render(
      <WidgetControlPanel
        layoutItems={widgets.map((widget, index) => ({
          i: widget.id,
          x: index * 3,
          y: 0,
          w: widget.defaultSize.w,
          h: widget.defaultSize.h,
          visible: true
        }))}
        widgets={widgets}
        onToggleWidget={vi.fn()}
        onResetLayout={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("My Time Today")).toBeTruthy();
    expect(screen.getByText("Team Utilization")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "My Work" }));
    expect(screen.getByText("My Time Today")).toBeTruthy();
    expect(screen.queryByText("Team Utilization")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Management" }));
    expect(screen.queryByText("My Time Today")).toBeNull();
    expect(screen.getByText("Team Utilization")).toBeTruthy();
  });
});
