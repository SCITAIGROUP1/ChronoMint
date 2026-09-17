import { render, screen } from "@testing-library/react";
import { StatStrip } from "./stat-strip.js";

describe("StatStrip", () => {
  it("lays out KPIs in one compact horizontal row", () => {
    render(
      <StatStrip>
        <div>Hours</div>
        <div>Billable</div>
      </StatStrip>
    );

    const strip = screen.getByTestId("stat-strip");
    expect(strip.className).toContain("shrink-0");
    expect(strip.className).toContain("overflow-x-auto");
    expect(strip.className).not.toContain("xl:grid-cols-4");
    expect(screen.getByText("Hours")).toBeInTheDocument();
  });
});
