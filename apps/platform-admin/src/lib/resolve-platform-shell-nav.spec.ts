import { describe, expect, it } from "vitest";
import {
  flattenNavSections,
  isPlatformAccountPath,
  resolvePlatformShellMode,
  resolvePlatformShellNav
} from "./resolve-platform-shell-nav";

describe("resolvePlatformShellNav", () => {
  it("uses grouped console nav on tenant routes", () => {
    const result = resolvePlatformShellNav({
      pathname: "/tenants",
      notificationUnreadCount: 0
    });
    expect(result.mode).toBe("console");
    expect(result.navSections.map((section) => section.label)).toEqual([
      "Operations",
      "Commercial",
      "Support"
    ]);
    expect(flattenNavSections(result.navSections)[0]?.href).toBe("/ops");
  });

  it("uses account nav on profile and settings", () => {
    expect(resolvePlatformShellMode("/profile")).toBe("account");
    expect(resolvePlatformShellMode("/settings")).toBe("account");
    expect(isPlatformAccountPath("/settings")).toBe(true);

    const result = resolvePlatformShellNav({
      pathname: "/settings",
      notificationUnreadCount: 2
    });
    expect(result.mode).toBe("account");
    expect(flattenNavSections(result.navSections).map((item) => item.href)).toEqual([
      "/profile",
      "/settings"
    ]);
  });

  it("limits support role console nav to helpdesk and notifications", () => {
    const result = resolvePlatformShellNav({
      pathname: "/helpdesk",
      notificationUnreadCount: 4,
      platformRole: "SUPPORT"
    });

    expect(result.navSections).toEqual([
      {
        id: "support",
        label: "Support",
        items: expect.arrayContaining([
          expect.objectContaining({ href: "/helpdesk" }),
          expect.objectContaining({ href: "/notifications", badge: 4 })
        ])
      }
    ]);
  });
});
