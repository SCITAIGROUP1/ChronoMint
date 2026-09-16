import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Label } from "./label.js";
import { Textarea } from "./textarea.js";

describe("Textarea", () => {
  it("associates label with textarea", () => {
    render(
      <>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" />
      </>
    );
    expect(screen.getByLabelText("Notes").tagName).toBe("TEXTAREA");
  });

  it("accepts controlled value changes", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Notes" defaultValue="" />);
    const field = screen.getByLabelText("Notes");
    await user.type(field, "Code review");
    expect(field).toHaveValue("Code review");
  });
});
