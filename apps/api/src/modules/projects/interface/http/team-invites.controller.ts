import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { CurrentUser, RequestUser } from "../../../../common/decorators/current-user.decorator";
import { ProjectsService } from "../../application/projects.service";
import { PrismaService } from "../../../../common/prisma/prisma.service";

@Controller()
export class TeamInvitesController {
  constructor(
    private projects: ProjectsService,
    private prisma: PrismaService
  ) {}

  @Get("/team-invites/:token")
  preview(@Param("token") token: string) {
    return this.projects.previewInvite(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/team-invites/:token/accept")
  async accept(@Param("token") token: string, @CurrentUser() user: RequestUser) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    return this.projects.acceptInvite(token, user.userId, dbUser.email);
  }
}
