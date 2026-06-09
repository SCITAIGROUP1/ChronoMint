import {
  ErrorCodes,
  parseUserPreferences,
  parseWorkspaceSettings,
  resolveEffectiveDailyTargetHours,
  type ChangePasswordDto,
  type UpdateUserPreferencesDto,
  type UpdateUserProfileDto,
  type UserProfileDto
} from "@chronomint/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";

const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  defaultHourlyRate: true,
  preferences: true,
  createdAt: true
} as const;

type UserProfileRecord = {
  id: string;
  email: string;
  name: string;
  defaultHourlyRate: { toNumber(): number } | null;
  preferences: Prisma.JsonValue;
  createdAt: Date;
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService
  ) {}

  async getProfile(userId: string, workspaceId: string): Promise<UserProfileDto> {
    const user = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: userProfileSelect as Prisma.UserSelect
    })) as unknown as UserProfileRecord;
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });
    return this.toProfileDto(user, workspace.settings);
  }

  async updateProfile(userId: string, workspaceId: string, dto: UpdateUserProfileDto) {
    const user = (await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: userProfileSelect as Prisma.UserSelect
    })) as unknown as UserProfileRecord;
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });
    return this.toProfileDto(user, workspace.settings);
  }

  async updatePreferences(
    userId: string,
    workspaceId: string,
    dto: UpdateUserPreferencesDto
  ): Promise<UserProfileDto> {
    const existing = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { preferences: true } as Prisma.UserSelect
    })) as unknown as { preferences: Prisma.JsonValue };
    const currentPreferences = parseUserPreferences(existing.preferences);
    const merged = { ...currentPreferences, ...dto };

    const user = (await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: merged as Prisma.InputJsonValue } as Prisma.UserUpdateInput,
      select: userProfileSelect as Prisma.UserSelect
    })) as unknown as UserProfileRecord;
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });
    return this.toProfileDto(user, workspace.settings);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Current password is incorrect",
        HttpStatus.UNAUTHORIZED
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
    await this.auth.revokeAllRefreshTokens(userId);
    return { ok: true };
  }

  private toProfileDto(user: UserProfileRecord, workspaceSettingsRaw: unknown): UserProfileDto {
    const preferences = parseUserPreferences(user.preferences);
    const workspaceSettings = parseWorkspaceSettings(workspaceSettingsRaw);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      defaultHourlyRate: user.defaultHourlyRate?.toNumber() ?? null,
      preferences,
      effectiveDailyTargetHours: resolveEffectiveDailyTargetHours(
        preferences,
        workspaceSettings.dailyTargetHours
      ),
      createdAt: user.createdAt.toISOString()
    };
  }
}
