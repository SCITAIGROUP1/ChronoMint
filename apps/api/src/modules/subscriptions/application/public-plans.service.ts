import type { PublicPlanListDto } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class PublicPlansService {
  constructor(private prisma: PrismaService) {}

  async listPublicPlans(): Promise<PublicPlanListDto> {
    const plans = await generatedPrisma(this.prisma).plan.findMany({
      where: { isPublic: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    return {
      items: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        limits: plan.limits as PublicPlanListDto["items"][number]["limits"]
      }))
    };
  }
}
