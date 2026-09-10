import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WidgetShell } from "./widget-shell.js";

describe("WidgetShell", () => {
  it("renders children in view mode", () => {
    const html = renderToStaticMarkup(
      <WidgetShell id="weekly_chart" label="Weekly Activity" isEditing={false}>
        <div>Chart body</div>
      </WidgetShell>
    );
    expect(html).toContain("Weekly Activity");
    expect(html).toContain("Chart body");
  });

  it("leaves bottom-right edge free for resize handles while editing", () => {
    const html = renderToStaticMarkup(
      <WidgetShell id="weekly_chart" label="Weekly Activity" isEditing>
        <div>Chart body</div>
      </WidgetShell>
    );
    expect(html).toContain("bottom-3");
    expect(html).toContain("right-3");
    expect(html).toContain("cursor-grab");
  });

  it("fills the grid cell without scrolling the shell", () => {
    const html = renderToStaticMarkup(
      <WidgetShell id="personal_daily_progress" label="My Daily Progress" isEditing={false}>
        <div>Progress body</div>
      </WidgetShell>
    );
    expect(html).toContain("overflow-hidden");
    expect(html).not.toContain("overflow-auto");
  });
});
