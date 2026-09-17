import { render, screen } from "@testing-library/react";
import { pageAppBarClass, pageLayoutClass, pageMainClass } from "./page-density.js";
import { PageLayout } from "./page-layout.js";

describe("PageLayout", () => {
  it("fills leftover height with shrink-0 chrome and a flex-1 main slot", () => {
    const { container } = render(
      <PageLayout title="Projects" description="Workspace projects" stats={<div>Stats</div>}>
        <div>Table</div>
      </PageLayout>
    );

    const layout = screen.getByTestId("page-layout");
    expect(layout.className).toContain("flex-1");
    expect(layout.className).toContain("flex-col");
    expect(pageLayoutClass).toContain("min-h-0");

    const banner = screen.getByRole("banner");
    expect(banner.className).toContain(pageAppBarClass);

    const main = screen.getByTestId("page-layout-main");
    expect(main.className).toContain("flex-1");
    expect(main.className).toContain("min-h-0");
    expect(main.className).toContain("overflow-y-auto");
    expect(pageMainClass).toContain("flex-col");
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("Stats").parentElement?.className).toContain("shrink-0");
    expect(container.querySelector("[data-scroll='main']")).toBeTruthy();
  });

  it("lets long forms scroll the page instead of a tiny inner pane", () => {
    render(
      <PageLayout title="Settings" scroll="page">
        <form>Fields</form>
      </PageLayout>
    );

    expect(screen.getByTestId("page-layout").getAttribute("data-scroll")).toBe("page");
    expect(screen.getByTestId("page-layout").className).toContain("overflow-y-auto");
    expect(screen.getByTestId("page-layout-main").className).toContain("flex-none");
  });
});
