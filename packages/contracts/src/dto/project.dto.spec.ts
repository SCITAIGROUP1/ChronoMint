import { describe, expect, it } from "vitest";
import { projectListItemSchema } from "./project.dto";

describe("projectListItemSchema", () => {
  it("requires totalTrackedSec on list rows", () => {
    const parsed = projectListItemSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Annual Audit",
      color: "#236bfe",
      clientName: "Adventure Works",
      totalTrackedSec: 7200,
      isActive: true
    });

    expect(parsed.totalTrackedSec).toBe(7200);
  });
});
