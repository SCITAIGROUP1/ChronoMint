import { describe, expect, it } from "vitest";
import { configuredAuthScope } from "./configured-auth-scope";

describe("configuredAuthScope", () => {
  it("supports app and platform scopes", () => {
    expect(configuredAuthScope("app", "app")).toBe("app");
    expect(configuredAuthScope("platform", "app")).toBe("platform");
    expect(configuredAuthScope(undefined, "app")).toBe("app");
  });

  it.each(["client", "admin"])("rejects retired %s scope", (scope) => {
    expect(() => configuredAuthScope(scope, "app")).toThrow(`Unsupported auth scope: ${scope}`);
  });
});
