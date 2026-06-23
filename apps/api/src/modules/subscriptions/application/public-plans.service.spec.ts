import { PLAN_IDS, PLAN_SLUGS } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PublicPlansService } from "./public-plans.service";

describe("PublicPlansService", () => {
  let service: PublicPlansService;
  let mockPrisma: { plan: { findMany: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    mockPrisma = {
      plan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: PLAN_IDS[PLAN_SLUGS.STARTER],
            name: "Starter",
            slug: PLAN_SLUGS.STARTER,
            limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 }
          }
        ])
      }
    };
    service = new PublicPlansService(mockPrisma as never);
  });

  it("returns only public plans", async () => {
    const result = await service.listPublicPlans();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.slug).toBe(PLAN_SLUGS.STARTER);
    expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublic: true } })
    );
  });
});
