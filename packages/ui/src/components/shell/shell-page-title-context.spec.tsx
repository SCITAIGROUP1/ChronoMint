import { render, screen, waitFor } from "@testing-library/react";
import { Home } from "lucide-react";
import type { ReactNode } from "react";
import { ResponsiveLayoutShell } from "../layout-shell.js";
import { AppBar } from "./app-bar.js";
import { resolveShellPageTitleLabel } from "./shell-page-title-context.js";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/team-management",
  useSearchParams: () => new URLSearchParams()
}));

describe("shell page title", () => {
  it("prefers an explicit titleLabel over a non-string title node", () => {
    expect(resolveShellPageTitleLabel(<span>Timesheet</span>, "Timesheet")).toBe("Timesheet");
    expect(resolveShellPageTitleLabel("Projects")).toBe("Projects");
    expect(resolveShellPageTitleLabel(<span>Timesheet</span>)).toBeNull();
  });

  it("registers the AppBar title on the compact shell header", async () => {
    render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <AppBar title="Projects" />
      </ResponsiveLayoutShell>
    );

    await waitFor(() => {
      expect(screen.getByTestId("shell-mobile-header")).toHaveTextContent("Projects");
    });
  });
});
