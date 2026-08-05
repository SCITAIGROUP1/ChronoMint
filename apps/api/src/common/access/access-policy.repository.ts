import {
  POLICY_CHECKSUM,
  POLICY_VERSION,
  type ManagedRole,
  type Permission,
  type PolicyTargetDto,
  type ResourceScope
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type AccessPolicyTransaction = Prisma.TransactionClient;

@Injectable()
export class AccessPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async transaction<T>(work: (tx: AccessPolicyTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });
      } catch (error) {
        const retryableWriteRace =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" || error.code === "P2002");
        if (!retryableWriteRace || attempt >= 2) throw error;
      }
    }
  }

  async ensureState(tx: AccessPolicyTransaction, tenantId: string) {
    return tx.tenantPermissionPolicyState.upsert({
      where: { tenantId },
      create: {
        tenantId,
        policyVersion: POLICY_VERSION,
        policyChecksum: POLICY_CHECKSUM
      },
      update: {}
    });
  }

  async loadTargetOverrides(
    tx: AccessPolicyTransaction | PrismaClient,
    tenantId: string,
    target: PolicyTargetDto,
    permissions?: readonly string[]
  ) {
    const permissionFilter = permissions ? { in: [...permissions] } : undefined;
    if (target.type === "ROLE") {
      return tx.tenantRolePermissionOverride.findMany({
        where: {
          tenantId,
          role: target.role,
          scope: target.scope,
          resourceId: target.resourceId,
          ...(permissionFilter ? { permission: permissionFilter } : {})
        }
      });
    }
    return tx.principalPermissionOverride.findMany({
      where: {
        tenantId,
        principalId: target.principalId,
        scope: target.scope,
        resourceId: target.resourceId,
        ...(permissionFilter ? { permission: permissionFilter } : {})
      }
    });
  }

  async loadEvaluationSnapshot(
    input: {
      tenantId: string;
      principalId: string;
      permission: Permission;
      resource: { scope: ResourceScope; id: string; workspaceId?: string };
      bindings: readonly {
        role: ManagedRole;
        resourceId: string;
        bindingScope?: ResourceScope;
      }[];
    },
    db?: AccessPolicyTransaction
  ) {
    const load = async (tx: AccessPolicyTransaction) => {
      const roleTargets = input.bindings.flatMap((binding) =>
        binding.bindingScope
          ? [
              {
                role: binding.role,
                scope: binding.bindingScope,
                resourceId: binding.resourceId
              }
            ]
          : []
      );
      const [state, roleOverrides, principalOverrides] = await Promise.all([
        tx.tenantPermissionPolicyState.findUnique({ where: { tenantId: input.tenantId } }),
        roleTargets.length
          ? tx.tenantRolePermissionOverride.findMany({
              where: {
                tenantId: input.tenantId,
                permission: input.permission,
                OR: roleTargets
              }
            })
          : Promise.resolve([]),
        tx.principalPermissionOverride.findMany({
          where: {
            tenantId: input.tenantId,
            principalId: input.principalId,
            permission: input.permission,
            OR: [
              { scope: input.resource.scope, resourceId: input.resource.id },
              ...(input.resource.scope === "project" && input.resource.workspaceId
                ? [{ scope: "workspace", resourceId: input.resource.workspaceId }]
                : [])
            ]
          }
        })
      ]);
      return { state, roleOverrides, principalOverrides };
    };
    return db ? load(db) : this.prisma.$transaction(load);
  }

  client(): PrismaService {
    return this.prisma;
  }
}
