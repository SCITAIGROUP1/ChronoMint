import { describe, expect, it } from "vitest";
import { platformOpsSummarySchema } from "./platform.dto";

describe("platformOpsSummarySchema", () => {
  it("accepts ops summary payload", () => {
    const result = platformOpsSummarySchema.safeParse({
      tenants: {
        active: 2,
        trial: 1,
        suspended: 0,
        churned: 0,
        pendingSetup: 1
      },
      subscriptions: {
        active: 2,
        trial: 1,
        pastDue: 0,
        canceled: 0
      },
      usage: {
        totalWorkspaces: 3,
        totalSeats: 10
      },
      queues: {
        "mail-queue": { waiting: 0, active: 0, failed: 0, delayed: 0 }
      },
      mrr: { currency: "usd", amountCents: 2900, source: "stripe" },
      reconcile: {
        driftCount: 0,
        lastCheckedAt: "2026-06-24T12:00:00.000Z"
      }
    });
    expect(result.success).toBe(true);
  });
});
