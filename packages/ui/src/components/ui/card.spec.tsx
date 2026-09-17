import { render, screen } from "@testing-library/react";
import { Card, CardContent, CardHeader, CardTitle } from "./card.js";

describe("Card", () => {
  it("renders card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>Details</CardContent>
      </Card>
    );
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Summary").closest("[data-density]")).toHaveAttribute(
      "data-density",
      "default"
    );
  });

  it("supports compact density without default card padding", () => {
    const { container } = render(<Card density="compact">Tight</Card>);
    const card = container.querySelector("[data-slot='card']");
    expect(card).toHaveAttribute("data-density", "compact");
    expect(card?.className).toContain("py-0");
    expect(card?.className).not.toContain("py-6");
  });
});
