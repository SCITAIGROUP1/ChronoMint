import type {
  ApplyTenantHolidayResponseDto,
  CreateTenantHolidayDto,
  ListTenantHolidaysQueryDto,
  ListTenantHolidaysResponseDto,
  TenantHolidayDto,
  UpdateTenantHolidayDto
} from "@kloqra/contracts";
import {
  ErrorCodes,
  parseUserPreferences,
  parseWorkspaceSettings,
  resolveEffectiveDailyTargetHours,
  nonProjectDurationSec
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { addSeconds, localTimeToUtc } from "../../../common/time/local-time.util";

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toDto(row: {
  id: string;
  tenantId: string;
  date: Date;
  name: string;
  isActive: boolean;
}): TenantHolidayDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    date: toDateKey(row.date),
    name: row.name,
    isActive: row.isActive
  };
}

@Injectable()
export class TenantHolidaysService {
  constructor(private prisma: PrismaService) {}

  async list(
    tenantId: string,
    query: ListTenantHolidaysQueryDto
  ): Promise<ListTenantHolidaysResponseDto> {
    const items = await this.prisma.tenantHoliday.findMany({
      where: {
        tenantId,
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
                ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {})
              }
            }
          : {})
      },
      orderBy: { date: "asc" }
    });
    return { items: items.map(toDto) };
  }

  async create(tenantId: string, dto: CreateTenantHolidayDto): Promise<TenantHolidayDto> {
    try {
      const row = await this.prisma.tenantHoliday.create({
        data: {
          tenantId,
          date: new Date(`${dto.date}T00:00:00.000Z`),
          name: dto.name.trim(),
          isActive: true
        }
      });
      return toDto(row);
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw new DomainException(
          ErrorCodes.CONFLICT,
          "A holiday already exists on that date",
          HttpStatus.CONFLICT
        );
      }
      throw err;
    }
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTenantHolidayDto
  ): Promise<TenantHolidayDto> {
    const existing = await this.prisma.tenantHoliday.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Holiday not found", HttpStatus.NOT_FOUND);
    }
    const row = await this.prisma.tenantHoliday.update({
      where: { id },
      data: {
        ...(dto.date ? { date: new Date(`${dto.date}T00:00:00.000Z`) } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      }
    });
    return toDto(row);
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.tenantHoliday.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Holiday not found", HttpStatus.NOT_FOUND);
    }
    await this.prisma.tenantHoliday.delete({ where: { id } });
    return { ok: true };
  }

  async applyToMembers(tenantId: string, id: string): Promise<ApplyTenantHolidayResponseDto> {
    const holiday = await this.prisma.tenantHoliday.findFirst({ where: { id, tenantId } });
    if (!holiday) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Holiday not found", HttpStatus.NOT_FOUND);
    }
    if (!holiday.isActive) {
      throw new DomainException(
        ErrorCodes.ENTITY_INACTIVE,
        "Inactive holidays cannot be applied",
        HttpStatus.BAD_REQUEST
      );
    }

    const members = await this.prisma.tenantMember.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            preferences: true,
            memberships: {
              where: { isActive: true, workspace: { tenantId } },
              select: {
                workspaceId: true,
                workspace: { select: { id: true, settings: true } }
              }
            }
          }
        }
      }
    });

    const dateKey = toDateKey(holiday.date);
    const skipped: { userId: string; reason: string }[] = [];
    let createdCount = 0;

    for (const member of members) {
      const workspace = member.user.memberships[0]?.workspace;
      if (!workspace) {
        skipped.push({ userId: member.userId, reason: "no_workspace" });
        continue;
      }
      const settings = parseWorkspaceSettings(workspace.settings);
      const prefs = parseUserPreferences(member.user.preferences);
      const dayHours = resolveEffectiveDailyTargetHours(prefs, settings.dailyTargetHours);
      const durationSec = nonProjectDurationSec("PUBLIC_HOLIDAY", dayHours);
      const timezone = settings.timezone || "UTC";
      const start = localTimeToUtc(dateKey, "09:00", timezone);
      const end = addSeconds(start, durationSec);

      const overlap = await this.prisma.timeLog.findFirst({
        where: {
          userId: member.userId,
          startTime: { lt: end },
          endTime: { gt: start }
        },
        select: { id: true }
      });
      if (overlap) {
        skipped.push({ userId: member.userId, reason: "overlap" });
        continue;
      }

      await this.prisma.timeLog.create({
        data: {
          userId: member.userId,
          taskId: null,
          classification: "PUBLIC_HOLIDAY",
          tenantId,
          workspaceId: workspace.id,
          holidayId: holiday.id,
          startTime: start,
          endTime: end,
          durationSec,
          description: holiday.name,
          isBillable: false,
          source: "manual"
        }
      });
      createdCount += 1;
    }

    return { createdCount, skippedCount: skipped.length, skipped };
  }
}
