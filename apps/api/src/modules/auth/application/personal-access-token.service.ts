import { createHash, randomBytes } from "node:crypto";
import type {
  CreatePersonalAccessTokenDto,
  CreatePersonalAccessTokenResponseDto,
  PersonalAccessTokenDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { integrationPrisma } from "../../../common/prisma/integration-prisma";
import { PrismaService } from "../../../common/prisma/prisma.service";

const PAT_PREFIX = "klo_pat_";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class PersonalAccessTokenService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, workspaceId: string): Promise<PersonalAccessTokenDto[]> {
    const rows = await integrationPrisma(this.prisma).personalAccessToken.findMany({
      where: { userId, workspaceId, revokedAt: null },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(
    userId: string,
    workspaceId: string,
    dto: CreatePersonalAccessTokenDto
  ): Promise<CreatePersonalAccessTokenResponseDto> {
    const raw = `${PAT_PREFIX}${randomBytes(32).toString("base64url")}`;
    const row = await integrationPrisma(this.prisma).personalAccessToken.create({
      data: {
        userId,
        workspaceId,
        name: dto.name,
        tokenHash: hashToken(raw)
      }
    });
    return {
      token: raw,
      item: this.toDto(row)
    };
  }

  async revoke(userId: string, workspaceId: string, id: string): Promise<{ ok: true }> {
    const row = await integrationPrisma(this.prisma).personalAccessToken.findFirst({
      where: { id, userId, workspaceId, revokedAt: null }
    });
    if (!row) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Token not found", HttpStatus.NOT_FOUND);
    }
    await integrationPrisma(this.prisma).personalAccessToken.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
    return { ok: true };
  }

  async authenticate(rawToken: string): Promise<{
    userId: string;
    workspaceId: string;
    role: "ADMIN" | "MEMBER";
  }> {
    if (!rawToken.startsWith(PAT_PREFIX)) {
      throw new DomainException(
        ErrorCodes.PERSONAL_ACCESS_TOKEN_INVALID,
        "Invalid personal access token",
        HttpStatus.UNAUTHORIZED
      );
    }
    const tokenRow = await integrationPrisma(this.prisma).personalAccessToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: {
        user: {
          include: {
            memberships: true
          }
        }
      }
    });

    if (!tokenRow || tokenRow.revokedAt) {
      throw new DomainException(
        ErrorCodes.PERSONAL_ACCESS_TOKEN_INVALID,
        "Invalid personal access token",
        HttpStatus.UNAUTHORIZED
      );
    }
    if (tokenRow.expiresAt && tokenRow.expiresAt.getTime() <= Date.now()) {
      throw new DomainException(
        ErrorCodes.PERSONAL_ACCESS_TOKEN_INVALID,
        "Personal access token expired",
        HttpStatus.UNAUTHORIZED
      );
    }

    const membership = tokenRow.user?.memberships.find(
      (m) => m.workspaceId === tokenRow.workspaceId
    );
    if (!membership) {
      throw new DomainException(
        ErrorCodes.PERSONAL_ACCESS_TOKEN_INVALID,
        "Invalid personal access token",
        HttpStatus.UNAUTHORIZED
      );
    }

    await integrationPrisma(this.prisma).personalAccessToken.update({
      where: { id: tokenRow.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      userId: tokenRow.userId,
      workspaceId: tokenRow.workspaceId,
      role: membership.role as "ADMIN" | "MEMBER"
    };
  }

  private toDto(row: {
    id: string;
    name: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
  }): PersonalAccessTokenDto {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null
    };
  }
}
