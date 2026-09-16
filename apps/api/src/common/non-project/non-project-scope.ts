import { SYSTEM_TENANT_ACTIVITY_TYPES } from "@kloqra/contracts";

type Db = {
  tenantActivityType: {
    upsert(args: unknown): Promise<unknown>;
  };
};

export async function ensureSystemActivityTypes(db: Db, tenantId: string) {
  for (const type of SYSTEM_TENANT_ACTIVITY_TYPES) {
    await db.tenantActivityType.upsert({
      where: { tenantId_name: { tenantId, name: type.name } },
      create: {
        tenantId,
        name: type.name,
        slug: type.slug,
        color: type.color,
        isSystem: true,
        isActive: true
      },
      update: {
        slug: type.slug,
        isSystem: true
      }
    } as never);
  }
}

export function timeLogWorkspaceWhere(
  workspaceId: string,
  tenantId: string,
  options?: {
    nonProjectTime?: "include" | "exclude" | "only";
    projectScoped?: boolean;
  }
) {
  return composeTimeLogScopeWhere({
    workspaceId,
    tenantId,
    nonProjectTime: options?.nonProjectTime,
    hasProjectFilters: options?.projectScoped,
    projectLogsWhere: { task: { project: { workspaceId } } }
  });
}

export function composeTimeLogScopeWhere(options: {
  workspaceId: string;
  tenantId: string;
  nonProjectTime?: "include" | "exclude" | "only";
  hasProjectFilters?: boolean;
  projectLogsWhere: Record<string, unknown>;
}) {
  const nonProjectWhere = {
    classification: { not: "PROJECT" as const },
    tenantId: options.tenantId
  };
  const mode = options.nonProjectTime;
  if (mode === "only") return nonProjectWhere;
  if (mode === "include") {
    return { OR: [options.projectLogsWhere, nonProjectWhere] };
  }
  if (mode === "exclude" || options.hasProjectFilters) return options.projectLogsWhere;
  return { OR: [options.projectLogsWhere, nonProjectWhere] };
}
