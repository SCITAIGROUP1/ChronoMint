import { describe, expect, it, vi } from "vitest";
import { isCommercialFeaturesEnabled } from "./commercial-features";

describe("isCommercialFeaturesEnabled", () => {
  it("defaults to true when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES", undefined);
    expect(isCommercialFeaturesEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("uses the shared client flag so UI and API configuration can stay paired", () => {
    vi.stubEnv("NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES", "false");
    expect(isCommercialFeaturesEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
