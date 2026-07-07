/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from "vitest";
import { getQueryClient, resetQueryClient } from "./query-client";

describe("getQueryClient", () => {
  beforeEach(() => {
    resetQueryClient();
  });

  it("returns the same browser singleton", () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });
});
