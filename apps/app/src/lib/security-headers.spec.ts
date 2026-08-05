import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "../../security-headers";

describe("unified app security headers", () => {
  it("uses hardened production defaults without unsafe script evaluation", () => {
    const routes = buildSecurityHeaders({
      nodeEnv: "production",
      apiBaseUrl: "https://api.kloqra.com"
    });
    const appHeaders = routes.find((route) => route.source.includes("?!widget"))?.headers ?? [];
    const csp = appHeaders.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self' https://api.kloqra.com wss://api.kloqra.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(appHeaders).toContainEqual(
      expect.objectContaining({ key: "Strict-Transport-Security" })
    );
  });

  it("allows development evaluation and keeps tokenized widgets embeddable", () => {
    const routes = buildSecurityHeaders({
      nodeEnv: "development",
      apiBaseUrl: "http://localhost:3001"
    });
    const appCsp =
      routes[0]?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
    const widget = routes.find((route) => route.source === "/widget/:path*");
    const widgetCsp =
      widget?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

    expect(appCsp).toContain("'unsafe-eval'");
    expect(appCsp).toContain("ws://localhost:3001");
    expect(widgetCsp).toContain("frame-ancestors *");
    expect(widget?.headers.some((header) => header.key === "X-Frame-Options")).toBe(false);
  });
});
