import { jiraIssueKeySchema } from "@kloqra/contracts";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("jiraIssue=PROJ-42")
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    resolveJiraIssue: vi.fn(),
    fetchListItems: vi.fn()
  };
});

describe("jiraIssueKeySchema", () => {
  it("accepts keys used in deep links", () => {
    expect(jiraIssueKeySchema.safeParse("PROJ-42").success).toBe(true);
  });
});
