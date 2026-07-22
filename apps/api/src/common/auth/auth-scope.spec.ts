import { describe, expect, it } from "vitest";
import {
  accessCookieName,
  getAuthScope,
  isProductAuthScope,
  refreshCookieName
} from "./auth-scope";

describe("auth scope", () => {
  it("recognizes the unified product scope", () => {
    const req = { headers: { "x-auth-scope": "app" } };
    expect(getAuthScope(req as never)).toBe("app");
    expect(isProductAuthScope("app")).toBe(true);
  });

  it.each(["client", "admin"])("rejects the retired %s scope header", (scope) => {
    expect(() => getAuthScope({ headers: { "x-auth-scope": scope } } as never)).toThrow(
      "Invalid auth scope"
    );
  });

  it("uses unified app and isolated platform cookie names", () => {
    expect(accessCookieName("app")).toBe("access_token");
    expect(refreshCookieName("app")).toBe("refresh_token");
    expect(accessCookieName("platform")).toBe("access_token_platform");
    expect(refreshCookieName("platform")).toBe("refresh_token_platform");
  });

  it("keeps platform outside product scopes", () => {
    expect(isProductAuthScope("platform")).toBe(false);
  });
});
