import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderDashboardResizeHandle } from "./dashboard-resize-handle";

describe("renderDashboardResizeHandle", () => {
  it("renders RGL-compatible handle classes for each axis", () => {
    const html = renderToStaticMarkup(renderDashboardResizeHandle("se", null));
    expect(html).toContain('data-testid="dashboard-resize-handle-se"');
    expect(html).toContain("react-resizable-handle");
    expect(html).toContain("react-resizable-handle-se");
    expect(html).toContain("bg-primary/70");
  });

  it("keeps edge handles lightweight", () => {
    const html = renderToStaticMarkup(renderDashboardResizeHandle("e", null));
    expect(html).toContain('data-testid="dashboard-resize-handle-e"');
    expect(html).not.toContain("bg-primary/70");
  });
});
