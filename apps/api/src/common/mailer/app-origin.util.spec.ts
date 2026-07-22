import { describe, expect, it } from "vitest";
import { appOrigin, originForNotificationHref } from "./app-origin.util";

describe("originForNotificationHref", () => {
  it("routes platform tenant paths to platform origin", () => {
    const prev = process.env.PUBLIC_PLATFORM_URL;
    process.env.PUBLIC_PLATFORM_URL = "http://platform.test";
    expect(originForNotificationHref("/tenants/abc")).toBe("http://platform.test");
    expect(originForNotificationHref("/ops")).toBe("http://platform.test");
    if (prev === undefined) delete process.env.PUBLIC_PLATFORM_URL;
    else process.env.PUBLIC_PLATFORM_URL = prev;
  });

  it("routes all product paths to the unified app origin", () => {
    const prev = process.env.PUBLIC_APP_URL;
    process.env.PUBLIC_APP_URL = "https://app.test/";
    expect(originForNotificationHref("/account/billing")).toBe(appOrigin());
    expect(originForNotificationHref("/dashboard")).toBe(appOrigin());
    expect(appOrigin()).toBe("https://app.test");
    if (prev === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = prev;
  });
});
