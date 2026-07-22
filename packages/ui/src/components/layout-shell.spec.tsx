import { render, screen, waitFor } from "@testing-library/react";
import { Home } from "lucide-react";
import type { ReactNode } from "react";
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from "../responsive-tiers.js";
import { ResponsiveLayoutShell } from "./layout-shell.js";
import { AppBar } from "./shell/app-bar.js";

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

let mockPathname = "/dashboard";
let mockSearch = "";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch)
}));

describe("ResponsiveLayoutShell", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    mockSearch = "";
  });

  it("renders navigation and main content", () => {
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
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Footer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Workspace").length).toBeGreaterThan(0);
  });

  it("accepts structured shell toolbar parts", () => {
    render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
        shellToolbar={{
          search: <input aria-label="Global search" />,
          actions: <button type="button">Notify</button>
        }}
      >
        <AppBar title="Dashboard" />
      </ResponsiveLayoutShell>
    );

    expect(screen.getByRole("textbox", { name: "Global search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notify" })).toBeInTheDocument();
  });

  it("establishes a named shell container for responsive app bar layout", () => {
    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    const shellContainer = container.querySelector("[class*='@container/shell']");
    expect(shellContainer).toBeTruthy();
  });

  it("keeps brand and context fixed while only the nav region scrolls", async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "true");

    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    await waitFor(() => {
      const aside = container.querySelector("aside.hidden.md\\:flex");
      const header = aside?.children[0];
      const navScroll = aside?.children[1];
      expect(header?.className).toContain("gap-5");
      expect(header?.className).toContain("shrink-0");
      expect(navScroll?.className).toContain("overflow-y-auto");
      expect(navScroll?.className).toContain("flex-1");
      expect(navScroll?.querySelector("nav")).toBeTruthy();
    });

    localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  });

  it("auto-collapses the sidebar on compact laptop viewports when no preference is saved", async () => {
    localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1366 });

    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    await waitFor(() => {
      const aside = container.querySelector("aside.hidden.md\\:flex");
      expect(aside?.className).toContain("w-[5rem]");
    });
  });

  it("uses a single scroll container in the shell root", () => {
    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    const root = container.firstElementChild;
    expect(root?.className).toContain("h-dvh");
    expect(root?.className).toContain("overflow-hidden");
  });

  it("renders a compact count badge on nav icons when the sidebar is collapsed", async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "true");

    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[
          { href: "/dashboard", label: "Dashboard", Icon: Home },
          { href: "/approvals", label: "Approvals", Icon: Home, badge: 3 }
        ]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    await waitFor(() => {
      const badge = Array.from(container.querySelectorAll("[aria-hidden]")).find(
        (el) => el.textContent === "3"
      );
      expect(badge?.className).toContain("size-3");
      expect(badge?.className).toContain("text-[7px]");
    });

    localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  });

  it("renders optional nav section label", () => {
    render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Switcher</div>}
        footerContent={() => <div>Footer</div>}
        navSectionLabel="Workspace"
        navAriaLabel="Workspace navigation"
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getAllByText("Workspace").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("navigation", { name: "Workspace navigation" }).length
    ).toBeGreaterThan(0);
  });

  it("renders multiple nav sections with headings when expanded", () => {
    render(
      <ResponsiveLayoutShell
        navSections={[
          {
            id: "workspace",
            label: "Workspace",
            items: [{ href: "/dashboard", label: "Dashboard", Icon: Home }]
          },
          {
            id: "my-time",
            label: "My time",
            items: [{ href: "/overview", label: "Overview", Icon: Home }]
          }
        ]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Switcher</div>}
        footerContent={() => <div>Footer</div>}
        navAriaLabel="Workspace navigation"
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getAllByText("Workspace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("My time").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Overview" }).length).toBeGreaterThan(0);
  });

  it("omits empty nav sections", () => {
    render(
      <ResponsiveLayoutShell
        navSections={[
          {
            id: "workspace",
            label: "Workspace",
            items: [{ href: "/dashboard", label: "Dashboard", Icon: Home }]
          },
          { id: "my-time", label: "My time", items: [] }
        ]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Switcher</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.queryByText("My time")).not.toBeInTheDocument();
  });

  it("does not crash when navSections are passed without navItems", () => {
    render(
      <ResponsiveLayoutShell
        navSections={[
          {
            id: "operations",
            label: "Operations",
            items: [{ href: "/ops", label: "Ops", Icon: Home }]
          },
          // Defensive: treat missing items like an empty section.
          { id: "broken", label: "Broken", items: undefined as unknown as [] }
        ]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Platform"
        logoLinkHref="/ops"
        workspaceSwitcher={() => <div>Switcher</div>}
        footerContent={() => <div>Footer</div>}
        navAriaLabel="Platform navigation"
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getAllByText("Ops").length).toBeGreaterThan(0);
    expect(screen.queryByText("Broken")).not.toBeInTheDocument();
  });

  it("marks only the most specific account nav item active", () => {
    mockPathname = "/account/organization";

    render(
      <ResponsiveLayoutShell
        navItems={[
          { href: "/account", label: "Summary", Icon: Home },
          { href: "/account/organization", label: "Organization", Icon: Home }
        ]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getAllByRole("link", { name: "Summary" })[0]).not.toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getAllByRole("link", { name: "Organization" })[0]).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
