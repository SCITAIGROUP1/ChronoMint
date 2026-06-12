import { render, screen } from "@testing-library/react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

describe("Popover", () => {
  it("renders trigger content", () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <button type="button">Open menu</button>
        </PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    );

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});
