import type {
  CreateTenantActivityTypeDto,
  ListTenantActivityTypesQueryDto,
  ListTenantActivityTypesResponseDto,
  TenantActivityTypeDto,
  UpdateTenantActivityTypeDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { ensureSystemActivityTypes } from "../../../common/non-project/non-project-scope";
import { PrismaService } from "../../../common/prisma/prisma.service";

const DEFAULT_ACTIVITY_COLOR = "#0d9488";

function toDto(row: {
  id: string;
  tenantId: string;
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
    isActive: row.isActive
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
    try {
      const row = await this.prisma.tenantActivityType.create({
        data: {
          tenantId,
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
    const row = await this.prisma.tenantActivityType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && !existing.isSystem ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
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
}
