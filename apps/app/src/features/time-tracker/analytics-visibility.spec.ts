/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  ANALYTICS_VISIBLE_KEY,
  readAnalyticsVisiblePreference,
  writeAnalyticsVisiblePreference
} from "./analytics-visibility";

describe("analytics-visibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to hidden when unset", () => {
    expect(readAnalyticsVisiblePreference()).toBe(false);
  });

  it("persists show/hide preference", () => {
    writeAnalyticsVisiblePreference(false);
    expect(window.localStorage.getItem(ANALYTICS_VISIBLE_KEY)).toBe("false");
    expect(readAnalyticsVisiblePreference()).toBe(false);
    writeAnalyticsVisiblePreference(true);
    expect(readAnalyticsVisiblePreference()).toBe(true);
  });

  it("falls back to default when storage throws", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readAnalyticsVisiblePreference()).toBe(false);
    getItem.mockRestore();
  });
});
