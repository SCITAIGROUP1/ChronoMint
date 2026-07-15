import type { PrismaService } from "../prisma/prisma.service";

export async function resolveUserTenantId(
  prisma: PrismaService,
  userId: string
): Promise<string | null> {
  const tenantMember = await prisma.tenantMember.findUnique({
    where: { userId },
    select: { tenantId: true }
  });
  if (tenantMember) return tenantMember.tenantId;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, isActive: true },
    select: { workspace: { select: { tenantId: true } } },
    orderBy: { createdAt: "asc" }
  });
  return membership?.workspace.tenantId ?? null;
}
