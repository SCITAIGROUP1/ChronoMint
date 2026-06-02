import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ErrorCodes } from "@chronomint/contracts";
import type { LoginDto, RegisterDto, AuthSessionDto } from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { HttpStatus } from "@nestjs/common";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new DomainException(ErrorCodes.EMAIL_EXISTS, "Email already registered", HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const wsName = dto.workspaceName ?? `${dto.name}'s Workspace`;
    let slug = slugify(wsName);
    const slugTaken = await this.prisma.workspace.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${Date.now()}`;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        memberships: {
          create: {
            role: "ADMIN",
            workspace: { create: { name: wsName, slug } }
          }
        }
      },
      include: { memberships: { include: { workspace: true } } }
    });

    const membership = user.memberships[0]!;
    return this.buildSession(
      user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name
    );
  }

  async switchWorkspace(userId: string, workspaceId: string): Promise<AuthSessionDto> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { user: true, workspace: true }
    });
    if (!membership) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Not a member of this workspace",
        HttpStatus.FORBIDDEN
      );
    }
    return this.buildSession(
      membership.user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name
    );
  }

  async login(dto: LoginDto): Promise<AuthSessionDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { include: { workspace: true }, take: 1 } }
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new DomainException(ErrorCodes.UNAUTHORIZED, "Invalid credentials", HttpStatus.UNAUTHORIZED);
    }
    const membership = user.memberships[0];
    if (!membership) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "No workspace membership", HttpStatus.NOT_FOUND);
    }
    return this.buildSession(
      user,
      membership.workspaceId,
      membership.role as "ADMIN" | "MEMBER",
      membership.workspace.name
    );
  }

  signAccessToken(userId: string, workspaceId: string, role: "ADMIN" | "MEMBER"): string {
    return this.jwt.sign(
      { sub: userId, userId, workspaceId, role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m" }
    );
  }

  signRefreshToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_EXPIRES ?? "7d" }
    );
  }

  verifyRefresh(token: string): { userId: string } {
    const payload = this.jwt.verify(token, { secret: process.env.JWT_REFRESH_SECRET }) as { sub: string };
    return { userId: payload.sub };
  }

  private buildSession(
    user: { id: string; email: string; name: string; defaultHourlyRate: { toNumber(): number } | null },
    workspaceId: string,
    role: "ADMIN" | "MEMBER",
    workspaceName: string
  ): AuthSessionDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultHourlyRate: user.defaultHourlyRate?.toNumber() ?? null
      },
      workspaceId,
      workspaceName,
      workspaceRole: role
    };
  }
}
