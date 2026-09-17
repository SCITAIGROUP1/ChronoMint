import { render, screen } from "@testing-library/react";
import { FloatingActionBar } from "./floating-action-bar.js";

describe("FloatingActionBar", () => {
  it("renders selection actions in a sticky bottom bar", () => {
    render(
      <FloatingActionBar>
        <button type="button">Approve Selected</button>
      </FloatingActionBar>
    );

    expect(screen.getByTestId("floating-action-bar").className).toContain("sticky");
    expect(screen.getByRole("button", { name: "Approve Selected" })).toBeInTheDocument();
  });
});
