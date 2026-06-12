import { ErrorCodes, type WorkspaceRole } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  async accessibleProjectIds(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<string[]> {
    if (role === "ADMIN") {
      const rows = await this.prisma.project.findMany({
        where: { workspaceId },
        select: { id: true }
      });
      return rows.map((r) => r.id);
    }
    if (role === "CLIENT") {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      if (!user) return [];
      const rows = await this.prisma.project.findMany({
        where: {
          workspaceId,
          isActive: true,
          OR: [
            { clientName: user.name },
            { clientName: user.email }
          ]
        },
        select: { id: true }
      });
      return rows.map((r) => r.id);
    }

    // MEMBER
    const rows = await this.prisma.teamMember.findMany({
      where: {
        userId,
        isActive: true,
        team: { project: { workspaceId, isActive: true } }
      },
      select: { team: { select: { projectId: true } } }
    });
    return rows.map((r) => r.team.projectId);
  }

  async assertCanAccessProject(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    projectId: string
  ) {
    if (role === "ADMIN") {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, workspaceId }
      });
      if (!project) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "You are not on this project's team",
          HttpStatus.FORBIDDEN
        );
      }
      return;
    }
    if (role === "CLIENT") {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      if (!user) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "You are not on this project's team",
          HttpStatus.FORBIDDEN
        );
      }
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, workspaceId, OR: [{ clientName: user.name }, { clientName: user.email }] }
      });
      if (!project) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "You are not on this project's team",
          HttpStatus.FORBIDDEN
        );
      }
      return;
    }

    const membership = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        isActive: true,
        team: { projectId, project: { workspaceId, isActive: true } }
      }
    });
    if (!membership) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "You are not on this project's team",
        HttpStatus.FORBIDDEN
      );
    }
  }
}
