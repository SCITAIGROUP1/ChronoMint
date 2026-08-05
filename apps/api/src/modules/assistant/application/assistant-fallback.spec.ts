import { describe, expect, it } from "vitest";
import { ASSISTANT_FALLBACK_LINKS, buildAssistantFallbackReply } from "./assistant-fallback";

describe("assistant-fallback", () => {
  it("points My Projects at the personal my-projects route", () => {
    expect(ASSISTANT_FALLBACK_LINKS).toContainEqual({
      label: "My Projects",
      href: "/my-projects"
    });
  });

  it("returns fallback reply with navigation links", () => {
    const reply = buildAssistantFallbackReply();
    expect(reply.links?.some((link) => link.href === "/my-projects")).toBe(true);
  });
});
