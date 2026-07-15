import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import type { PrismaService } from "../prisma/prisma.service";
import { resolveUserTenantId } from "./resolve-user-tenant-id";

/** D08 — reject if the user already belongs to a different organization. */
export async function assertUserNotInOtherTenant(
  prisma: PrismaService,
  userId: string,
  tenantId: string
): Promise<void> {
  const existingTenantId = await resolveUserTenantId(prisma, userId);
  if (existingTenantId && existingTenantId !== tenantId) {
    throw new DomainException(
      ErrorCodes.CONFLICT,
      "User already belongs to another organization",
      HttpStatus.CONFLICT
    );
  }
}
