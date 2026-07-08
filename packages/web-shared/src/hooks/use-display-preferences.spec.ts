/** @vitest-environment jsdom */
/* eslint-disable import/order -- vitest mocks must precede subject import */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: null as null | {
    preferences: { timezone?: string; weekStart?: "monday" | "sunday" };
    effectiveTimezone?: string;
    effectiveDateFormat?: "MDY" | "DMY" | "YMD";
    effectiveTimeFormat?: "12h" | "24h";
  }
}));

vi.mock("../features/account/use-user-profile", () => ({
  useUserProfile: () => ({ profile: mocks.profile })
}));

import { useDisplayPreferences } from "./use-display-preferences";

describe("useDisplayPreferences timezone", () => {
  beforeEach(() => {
    mocks.profile = null;
  });

  it("uses browser timezone when preference is Browser default (even if API says UTC)", () => {
    const browserTzSpy = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({
        ...Intl.DateTimeFormat().resolvedOptions(),
        timeZone: "Asia/Colombo"
      });

    mocks.profile = {
      preferences: {},
      effectiveTimezone: "UTC"
    };
    const { result } = renderHook(() => useDisplayPreferences());
    expect(result.current.timezone).toBe("Asia/Colombo");

    browserTzSpy.mockRestore();
  });

  it("honors an explicit timezone preference over browser", () => {
    mocks.profile = {
      preferences: { timezone: "America/New_York" },
      effectiveTimezone: "America/New_York"
    };
    const { result } = renderHook(() => useDisplayPreferences());
    expect(result.current.timezone).toBe("America/New_York");
  });

  it("honors explicit UTC preference", () => {
    mocks.profile = {
      preferences: { timezone: "UTC" },
      effectiveTimezone: "UTC"
    };
    const { result } = renderHook(() => useDisplayPreferences());
    expect(result.current.timezone).toBe("UTC");
  });
});
