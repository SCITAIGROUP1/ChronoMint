import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isAllowedBrowserOrigin } from "./allowed-origins";

const originalEnv = process.env;

describe("allowed-origins", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("allows configured app and platform URLs", () => {
    process.env.PUBLIC_APP_URL = "https://app.example.com";
    process.env.PUBLIC_PLATFORM_URL = "https://platform-only.example.com";

    expect(isAllowedBrowserOrigin("https://app.example.com")).toBe(true);
    expect(isAllowedBrowserOrigin("https://platform-only.example.com")).toBe(true);
    expect(isAllowedBrowserOrigin("https://evil.com")).toBe(false);
  });

  it("rejects unconfigured Vercel origins in production", () => {
    process.env.NODE_ENV = "production";
    expect(isAllowedBrowserOrigin("https://untrusted-preview.vercel.app")).toBe(false);
  });

  it("allows explicitly configured Vercel origins in production", () => {
    process.env.NODE_ENV = "production";
    process.env.PUBLIC_APP_URL = "https://kloqra-unified.vercel.app";
    expect(isAllowedBrowserOrigin("https://kloqra-unified.vercel.app")).toBe(true);
  });

  it("allows previews outside production only when explicitly enabled", () => {
    process.env.NODE_ENV = "development";
    expect(isAllowedBrowserOrigin("https://kloqra-preview.vercel.app")).toBe(false);
    process.env.ALLOW_VERCEL_PREVIEW_ORIGINS = "true";
    expect(isAllowedBrowserOrigin("https://kloqra-preview.vercel.app")).toBe(true);
  });
});
