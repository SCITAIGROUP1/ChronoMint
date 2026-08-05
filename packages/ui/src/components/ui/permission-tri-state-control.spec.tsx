import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PermissionTriStateControl } from "./permission-tri-state-control.js";

describe("PermissionTriStateControl", () => {
  it("announces the selected configuration and changes it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PermissionTriStateControl
        aria-label="Configure Manage members"
        value="INHERIT"
        onValueChange={onChange}
      />
    );

    expect(screen.getByRole("radiogroup", { name: "Configure Manage members" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Inherit" })).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("radio", { name: "Allow" }));
    expect(onChange).toHaveBeenCalledWith("ALLOW");
  });

  it("supports arrow-key cycling with focus", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState<"INHERIT" | "ALLOW" | "DENY">("INHERIT");
      return (
        <PermissionTriStateControl aria-label="Permission" value={value} onValueChange={setValue} />
      );
    }

    render(<Harness />);
    const inherit = screen.getByRole("radio", { name: "Inherit" });
    inherit.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Allow" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Allow" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Deny" })).toHaveAttribute("aria-checked", "true");
  });

  it("exposes disabled context without accepting changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PermissionTriStateControl
        aria-label="Immutable permission"
        value="ALLOW"
        onValueChange={onChange}
        disabled
      />
    );

    await user.click(screen.getByRole("radio", { name: "Deny" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
