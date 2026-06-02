import { Injectable } from "@nestjs/common";
import { ErrorCodes } from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { HttpStatus } from "@nestjs/common";

@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  async accessibleProjectIds(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER"
  ): Promise<string[]> {
    if (role === "ADMIN") {
      const rows = await this.prisma.project.findMany({
        where: { workspaceId },
        select: { id: true }
      });
      return rows.map((r) => r.id);
    }
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
    role: "ADMIN" | "MEMBER",
    projectId: string
  ) {
    const ids = await this.accessibleProjectIds(workspaceId, userId, role);
    if (!ids.includes(projectId)) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "You are not on this project's team",
        HttpStatus.FORBIDDEN
      );
    }
  }
}
