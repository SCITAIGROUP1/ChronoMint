import type {
  CreateTenantActivityTypeDto,
  ListTenantActivityTypesQueryDto,
  ListTenantActivityTypesResponseDto,
  TenantActivityTypeDto,
  UpdateTenantActivityTypeDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { DomainException } from "../../../common/errors/domain.exception";
import { ensureSystemActivityTypes } from "../../../common/non-project/non-project-scope";
import { PrismaService } from "../../../common/prisma/prisma.service";

const DEFAULT_ACTIVITY_COLOR = "#0d9488";

function parentIdOf(row: object): string | null {
  if (!("parentId" in row)) return null;
  const value = (row as { parentId?: string | null }).parentId;
  return value ?? null;
}

function childrenOf(tenantId: string, parentId: string): Prisma.TenantActivityTypeWhereInput {
  return { tenantId, parentId } as Prisma.TenantActivityTypeWhereInput;
}

function toDto(row: {
  id: string;
  tenantId: string;
  parentId?: string | null;
  name: string;
  slug: string | null;
  color: string;
  isSystem: boolean;
  isActive: boolean;
}): TenantActivityTypeDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    slug: row.slug,
    color: row.color,
    isSystem: row.isSystem,
    isActive: row.isActive,
    parentId: row.parentId ?? null
  };
}

@Injectable()
export class TenantActivityTypesService {
  constructor(private prisma: PrismaService) {}

  async list(
    tenantId: string,
    query: ListTenantActivityTypesQueryDto = {}
  ): Promise<ListTenantActivityTypesResponseDto> {
    await ensureSystemActivityTypes(this.prisma, tenantId);
    const items = await this.prisma.tenantActivityType.findMany({
      where: {
        tenantId,
        ...(query.isActive === undefined ? {} : { isActive: query.isActive })
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }]
    });
    return { items: items.map(toDto) };
  }

  async create(tenantId: string, dto: CreateTenantActivityTypeDto): Promise<TenantActivityTypeDto> {
    await ensureSystemActivityTypes(this.prisma, tenantId);
    const parentId = await this.resolveParentId(tenantId, dto.parentId);
    try {
      const row = await this.prisma.tenantActivityType.create({
        data: {
          tenantId,
          parentId,
          name: dto.name.trim(),
          color: dto.color ?? DEFAULT_ACTIVITY_COLOR,
          isSystem: false,
          isActive: true
        }
      });
      return toDto(row);
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw new DomainException(
          ErrorCodes.CONFLICT,
          "An activity type with that name already exists",
          HttpStatus.CONFLICT
        );
      }
      throw err;
    }
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTenantActivityTypeDto
  ): Promise<TenantActivityTypeDto> {
    const existing = await this.prisma.tenantActivityType.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Activity type not found",
        HttpStatus.NOT_FOUND
      );
    }
    if (existing.isSystem && dto.name && dto.name.trim() !== existing.name) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "System activity types cannot be renamed",
        HttpStatus.FORBIDDEN
      );
    }
    let parentId: string | null | undefined;
    if (dto.parentId !== undefined) {
      if (existing.isSystem && dto.parentId) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "System activity types stay top-level",
          HttpStatus.FORBIDDEN
        );
      }
      parentId = await this.resolveParentId(tenantId, dto.parentId, id);
    }
    const row = await this.prisma.tenantActivityType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && !existing.isSystem ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(parentId !== undefined ? { parentId } : {})
      }
    });
    return toDto(row);
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.tenantActivityType.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Activity type not found",
        HttpStatus.NOT_FOUND
      );
    }
    if (existing.isSystem) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "System activity types cannot be deleted",
        HttpStatus.FORBIDDEN
      );
    }
    const childCount = await this.prisma.tenantActivityType.count({
      where: childrenOf(tenantId, id)
    });
    if (childCount > 0) {
      throw new DomainException(
        ErrorCodes.CONFLICT,
        "Remove sub-activities first",
        HttpStatus.CONFLICT
      );
    }
    const inUse = await this.prisma.timeLog.count({ where: { activityTypeId: id } });
    if (inUse > 0) {
      throw new DomainException(
        ErrorCodes.CONFLICT,
        "This activity type is used on time entries. Deactivate it instead.",
        HttpStatus.CONFLICT
      );
    }
    await this.prisma.tenantActivityType.delete({ where: { id } });
    return { ok: true };
  }

  private async resolveParentId(
    tenantId: string,
    parentId: string | null | undefined,
    movingId?: string
  ): Promise<string | null> {
    if (!parentId) return null;
    if (movingId && parentId === movingId) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "An activity type cannot be nested under itself",
        HttpStatus.BAD_REQUEST
      );
    }
    const parent = await this.prisma.tenantActivityType.findFirst({
      where: { id: parentId, tenantId }
    });
    if (!parent) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Parent activity type not found",
        HttpStatus.NOT_FOUND
      );
    }
    if (parentIdOf(parent)) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Sub-activities cannot have their own sub-activities",
        HttpStatus.BAD_REQUEST
      );
    }
    if (movingId) {
      const childCount = await this.prisma.tenantActivityType.count({
        where: childrenOf(tenantId, movingId)
      });
      if (childCount > 0) {
        throw new DomainException(
          ErrorCodes.VALIDATION_ERROR,
          "Move or remove sub-activities before nesting this type",
          HttpStatus.BAD_REQUEST
        );
      }
    }
    return parent.id;
  }
}
