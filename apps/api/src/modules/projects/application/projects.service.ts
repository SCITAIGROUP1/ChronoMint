import { randomBytes } from "crypto";
import { ErrorCodes, pickDefaultProjectColor, buildPaginationMeta } from "@kloqra/contracts";
import type {
  AddTeamMemberDto,
  BulkInviteJobStatusDto,
  CreateProjectDto,
  CreateTeamInviteDto,
  ListProjectsQuery,
  ListProjectsResponse,
  ListProjectTeamQuery,
  ProjectListItemDto,
  ProvisionProjectTeamMembersDto,
  ProvisionProjectTeamMembersResponseDto,
  TeamMemberDto,
  UpdateProjectDto,
  UpdateTeamMemberDto,
  InviteMemberDto
} from "@kloqra/contracts";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, HttpStatus } from "@nestjs/common";
import { Queue } from "bullmq";
import * as ExcelJS from "exceljs";
import type { Response } from "express";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { RoleGrantAuditService } from "../../../common/access/role-grant-audit.service";
import { RoleGrantPolicyService } from "../../../common/access/role-grant-policy.service";
import { AuthRevocationService } from "../../../common/auth/auth-revocation.service";
import { DomainException } from "../../../common/errors/domain.exception";
import {
  emptyPaginatedResponse,
  paginationSkipTake,
  toPaginatedResponse
} from "../../../common/http/pagination.util";
import { appOrigin } from "../../../common/mailer/app-origin.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import { waiveOpenTimesheetPeriods } from "../../../common/time/timesheet-approval-policy.util";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";
import { PlanLimitService } from "../../subscriptions/application/plan-limit.service";

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
    private notificationsDispatch: NotificationsDispatchService,
    @InjectQueue(QUEUES.BULK_INVITE) private bulkInviteQueue: Queue,
    private planLimit: PlanLimitService,
    private roleGrantPolicy: RoleGrantPolicyService,
    private roleGrantAudit: RoleGrantAuditService,
    private authRevocation: AuthRevocationService
  ) {}

  private appOrigin() {
    return appOrigin();
  }

  private async ensureTeam(projectId: string) {
    let team = await this.prisma.team.findUnique({ where: { projectId } });
    if (!team) {
      team = await this.prisma.team.create({ data: { projectId } });
    }
    return team;
  }

  toListItem(
    p: {
      id: string;
      workspaceId: string;
      name: string;
      color: string;
      clientName: string | null;
      isActive: boolean;
      timesheetApprovalEnabled: boolean;
    },
    totalTrackedSec: number,
    workspaceName?: string,
    myColor?: string | null
  ): ProjectListItemDto {
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      clientName: p.clientName,
      totalTrackedSec,
      isActive: p.isActive,
      timesheetApprovalEnabled: p.timesheetApprovalEnabled,
      ...(workspaceName ? { workspaceId: p.workspaceId, workspaceName } : {}),
      ...(myColor !== undefined ? { myColor } : {})
    };
  }

  private async totalTrackedSecByProjectId(projectIds: string[]) {
    if (projectIds.length === 0) {
      return new Map<string, number>();
    }

    const tasks = await this.prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, projectId: true }
    });
    if (tasks.length === 0) {
      return new Map(projectIds.map((id) => [id, 0]));
    }

    const taskIdToProjectId = new Map(tasks.map((task) => [task.id, task.projectId]));
    const aggregates = await this.prisma.timeLog.groupBy({
      by: ["taskId"],
      where: { taskId: { in: tasks.map((task) => task.id) } },
      _sum: { durationSec: true }
    });

    const byProject = new Map<string, number>(projectIds.map((id) => [id, 0]));
    for (const row of aggregates) {
      const projectId = taskIdToProjectId.get(row.taskId);
      if (!projectId) continue;
      byProject.set(projectId, (byProject.get(projectId) ?? 0) + (row._sum.durationSec ?? 0));
    }

    return byProject;
  }

  toDto(
    p: {
      id: string;
      workspaceId: string;
      name: string;
      color: string;
      clientName: string | null;
      budgetHours: { toNumber(): number } | null;
      isActive: boolean;
      timesheetApprovalEnabled: boolean;
      timesheetApprovalPeriod: string | null;
      timesheetApprovalEnabledAt?: Date | null;
      createdAt?: Date;
    },
    workspaceName?: string,
    myColor?: string | null
  ) {
    return {
      id: p.id,
      workspaceId: p.workspaceId,
      workspaceName,
      name: p.name,
      color: p.color,
      ...(myColor !== undefined ? { myColor } : {}),
      clientName: p.clientName,
      budgetHours: p.budgetHours?.toNumber() ?? null,
      isActive: p.isActive,
      timesheetApprovalEnabled: p.timesheetApprovalEnabled,
      timesheetApprovalPeriod:
        p.timesheetApprovalPeriod === "daily" ||
        p.timesheetApprovalPeriod === "weekly" ||
        p.timesheetApprovalPeriod === "monthly" ||
        p.timesheetApprovalPeriod === "custom"
          ? p.timesheetApprovalPeriod
          : null,
      timesheetApprovalEnabledAt: p.timesheetApprovalEnabledAt
        ? p.timesheetApprovalEnabledAt.toISOString()
        : null,
      createdAt: p.createdAt ? p.createdAt.toISOString() : undefined
    };
  }

  private async myColorByProjectId(userId: string, projectIds: string[]) {
    if (projectIds.length === 0) return new Map<string, string>();
    const rows = await this.prisma.userProjectColor.findMany({
      where: { userId, projectId: { in: projectIds } },
      select: { projectId: true, color: true }
    });
    return new Map(rows.map((r) => [r.projectId, r.color]));
  }

  async list(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    query: ListProjectsQuery,
    options?: { adminScope?: boolean; managedProjectIds?: string[] }
  ): Promise<ListProjectsResponse> {
    const projectIds =
      role === "ADMIN"
        ? await this.access.manageableProjectIds(workspaceId, userId, role)
        : options?.adminScope && options.managedProjectIds && options.managedProjectIds.length > 0
          ? options.managedProjectIds
          : await this.access.accessibleProjectIds(workspaceId, userId, role);
    if (projectIds.length === 0) {
      return emptyPaginatedResponse<ProjectListItemDto>(query.page, query.limit);
    }

    const where = {
      id: { in: projectIds },
      workspaceId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { clientName: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        include: { workspace: { select: { name: true } } },
        orderBy: { name: "asc" },
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    const projectIdsOnPage = rows.map((p) => p.id);
    const [myColors, trackedByProject] = await Promise.all([
      role === "MEMBER" ? this.myColorByProjectId(userId, projectIdsOnPage) : Promise.resolve(null),
      this.totalTrackedSecByProjectId(projectIdsOnPage)
    ]);

    return toPaginatedResponse(
      rows.map((p) =>
        this.toListItem(
          p,
          trackedByProject.get(p.id) ?? 0,
          role === "MEMBER" ? p.workspace.name : undefined,
          role === "MEMBER" ? (myColors!.get(p.id) ?? null) : undefined
        )
      ),
      total,
      query.page,
      query.limit
    );
  }

  async create(workspaceId: string, dto: CreateProjectDto) {
    await this.assertNameAvailable(workspaceId, dto.name);
    const existingCount = await this.prisma.project.count({ where: { workspaceId } });
    const approvalEnabled = dto.timesheetApprovalEnabled ?? false;
    const p = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        color: dto.color ?? pickDefaultProjectColor(existingCount),
        clientName: dto.clientName,
        budgetHours: dto.budgetHours,
        isActive: dto.isActive ?? true,
        timesheetApprovalEnabled: approvalEnabled,
        timesheetApprovalPeriod: dto.timesheetApprovalPeriod ?? null,
        timesheetApprovalEnabledAt: approvalEnabled ? new Date() : null,
        timesheetApprovalPeriodEffectiveAt: approvalEnabled ? new Date() : null,
        team: { create: {} }
      },
      include: { workspace: { select: { name: true } } }
    });
    return this.toDto(p, p.workspace.name);
  }

  async get(workspaceId: string, userId: string, role: "ADMIN" | "MEMBER", id: string) {
    await this.access.assertCanAccessProject(workspaceId, userId, role, id);
    const p = await this.prisma.project.findFirst({
      where: { id, workspaceId },
      include: { workspace: { select: { name: true } } }
    });
    if (!p)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    const myColor =
      role === "MEMBER"
        ? ((await this.myColorByProjectId(userId, [id])).get(id) ?? null)
        : undefined;
    return this.toDto(p, p.workspace.name, myColor);
  }

  async update(workspaceId: string, id: string, dto: UpdateProjectDto) {
    const before = await this.getAdmin(workspaceId, id);
    if (dto.name && dto.name !== before.name) {
      await this.assertNameAvailable(workspaceId, dto.name, id);
    }

    const approvalEnabling =
      dto.timesheetApprovalEnabled === true && !before.timesheetApprovalEnabled;
    const approvalDisabling =
      dto.timesheetApprovalEnabled === false && before.timesheetApprovalEnabled;
    const periodChanging =
      dto.timesheetApprovalPeriod !== undefined &&
      dto.timesheetApprovalPeriod !== before.timesheetApprovalPeriod &&
      (before.timesheetApprovalEnabled || dto.timesheetApprovalEnabled === true);

    const now = new Date();
    const p = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        color: dto.color,
        clientName: dto.clientName,
        budgetHours: dto.budgetHours,
        isActive: dto.isActive,
        ...(dto.timesheetApprovalEnabled !== undefined
          ? { timesheetApprovalEnabled: dto.timesheetApprovalEnabled }
          : {}),
        ...(dto.timesheetApprovalPeriod !== undefined
          ? { timesheetApprovalPeriod: dto.timesheetApprovalPeriod }
          : {}),
        ...(approvalEnabling
          ? {
              timesheetApprovalEnabledAt: now,
              timesheetApprovalPeriodEffectiveAt: now
            }
          : {}),
        ...(approvalDisabling
          ? {
              timesheetApprovalEnabledAt: null,
              timesheetApprovalPeriodEffectiveAt: null
            }
          : {}),
        ...(periodChanging && !approvalEnabling ? { timesheetApprovalPeriodEffectiveAt: now } : {})
      },
      include: { workspace: { select: { name: true } } }
    });

    if (approvalDisabling || approvalEnabling || periodChanging) {
      await waiveOpenTimesheetPeriods(this.prisma, id);
    }

    if (approvalEnabling) {
      void this.notifyApprovalSettingsChanged(
        workspaceId,
        id,
        p.name,
        "enabled",
        p.timesheetApprovalPeriod
      ).catch(() => undefined);
    } else if (approvalDisabling) {
      void this.notifyApprovalSettingsChanged(workspaceId, id, p.name, "disabled").catch(
        () => undefined
      );
    } else if (periodChanging) {
      void this.notifyApprovalSettingsChanged(
        workspaceId,
        id,
        p.name,
        "period",
        p.timesheetApprovalPeriod
      ).catch(() => undefined);
    }

    if (dto.isActive === false && before.isActive) {
      void this.notifyProjectDeactivated(workspaceId, id, p.name).catch(() => undefined);
    }

    return this.toDto(p, p.workspace.name);
  }

  private async notifyProjectDeactivated(
    workspaceId: string,
    projectId: string,
    projectName: string
  ) {
    const members = await this.prisma.teamMember.findMany({
      where: { isActive: true, team: { projectId } },
      select: { userId: true }
    });
    for (const member of members) {
      await this.notificationsDispatch.notify({
        userId: member.userId,
        workspaceId,
        templateId: "project.deactivated",
        context: { projectName, projectId }
      });
    }
  }

  private approvalPeriodLabel(period: string | null): string {
    if (period === "daily") return "daily";
    if (period === "weekly") return "weekly";
    if (period === "monthly") return "monthly";
    if (period === "custom") return "custom";
    return "default";
  }

  private async notifyApprovalSettingsChanged(
    workspaceId: string,
    projectId: string,
    projectName: string,
    kind: "enabled" | "disabled" | "period",
    period: string | null = null
  ) {
    const members = await this.prisma.teamMember.findMany({
      where: { isActive: true, team: { projectId } },
      select: { userId: true }
    });

    let changeSummary: string;
    if (kind === "enabled") {
      changeSummary = `Timesheet approval enabled (${this.approvalPeriodLabel(period)})`;
    } else if (kind === "disabled") {
      changeSummary = "Timesheet approval disabled";
    } else {
      changeSummary = `Approval period changed to ${this.approvalPeriodLabel(period)}`;
    }

    for (const member of members) {
      await this.notificationsDispatch.notify({
        userId: member.userId,
        workspaceId,
        templateId: "project.approvalSettingsChanged",
        context: { projectName, projectId, changeSummary }
      });
    }
  }

  private notifyProjectUnassigned(
    workspaceId: string,
    userId: string,
    projectId: string,
    projectName: string
  ) {
    void this.notificationsDispatch
      .notify({
        userId,
        workspaceId,
        templateId: "project.unassigned",
        context: { projectName, projectId }
      })
      .catch(() => undefined);
  }

  private mapTeamMemberRow(member: {
    id: string;
    teamId: string;
    userId: string;
    role: string;
    isActive: boolean;
    createdAt?: Date;
    user: { name: string; email: string };
  }): TeamMemberDto {
    return {
      id: member.id,
      teamId: member.teamId,
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email,
      role: member.role as TeamMemberDto["role"],
      isActive: member.isActive ?? true,
      createdAt: member.createdAt ? member.createdAt.toISOString() : undefined
    };
  }

  private async requireManageProject(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    permission: "project:ListTeam" | "project:ManageTeam"
  ) {
    await this.access.assertCanManageProject(workspaceId, userId, role, projectId, permission);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
    return project;
  }

  private async getAdmin(workspaceId: string, id: string) {
    const p = await this.prisma.project.findFirst({ where: { id, workspaceId } });
    if (!p)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    return p;
  }

  private async assertNameAvailable(workspaceId: string, name: string, excludeProjectId?: string) {
    const existing = await this.prisma.project.findFirst({
      where: {
        workspaceId,
        name,
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {})
      }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Validation failed — Name is already taken in this workspace",
        HttpStatus.CONFLICT
      );
    }
  }

  async remove(workspaceId: string, id: string) {
    const project = await this.getAdmin(workspaceId, id);
    if (project.name === "Uncategorized") {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Cannot delete the default Uncategorized project.",
        HttpStatus.BAD_REQUEST
      );
    }

    // Find or create default Uncategorized project
    let uncategorized = await this.prisma.project.findFirst({
      where: { workspaceId, name: "Uncategorized" }
    });
    if (!uncategorized) {
      uncategorized = await this.prisma.project.create({
        data: {
          workspaceId,
          name: "Uncategorized",
          color: "#9ca3af"
        }
      });
      await this.ensureTeam(uncategorized.id);
    }

    // Find or create default Uncategorized category
    let uncategorizedCategory = await this.prisma.category.findFirst({
      where: { workspaceId, name: "Uncategorized" }
    });
    if (!uncategorizedCategory) {
      uncategorizedCategory = await this.prisma.category.create({
        data: {
          workspaceId,
          name: "Uncategorized",
          description: "System default category for uncategorized tasks."
        }
      });
    }

    // Find or create Uncategorized Task in Uncategorized project
    let uncategorizedTask = await this.prisma.task.findFirst({
      where: { projectId: uncategorized.id, taskName: "Uncategorized Task" }
    });
    if (!uncategorizedTask) {
      uncategorizedTask = await this.prisma.task.create({
        data: {
          projectId: uncategorized.id,
          categoryId: uncategorizedCategory.id,
          taskName: "Uncategorized Task",
          billableDefault: true
        }
      });
    }

    // Get all task IDs belonging to the project being deleted
    const tasksOfProject = await this.prisma.task.findMany({
      where: { projectId: id },
      select: { id: true }
    });
    const taskIds = tasksOfProject.map((t) => t.id);

    // Update all TimeLogs to point to the Uncategorized Task under Uncategorized project
    if (taskIds.length > 0) {
      await this.prisma.timeLog.updateMany({
        where: { taskId: { in: taskIds } },
        data: { taskId: uncategorizedTask.id }
      });
    }

    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  async getTeam(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    query: ListProjectTeamQuery
  ) {
    const project = await this.requireManageProject(
      workspaceId,
      userId,
      role,
      projectId,
      "project:ListTeam"
    );
    const team = await this.ensureTeam(projectId);

    const memberWhere = {
      teamId: team.id,
      ...(query.search
        ? {
            user: {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { email: { contains: query.search, mode: "insensitive" as const } }
              ]
            }
          }
        : {})
    };

    const [total, members] = await Promise.all([
      this.prisma.teamMember.count({ where: memberWhere }),
      this.prisma.teamMember.findMany({
        where: memberWhere,
        include: { user: true },
        orderBy: { createdAt: "asc" },
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    return {
      id: team.id,
      projectId: project.id,
      projectName: project.name,
      members: members.map((m) => this.mapTeamMemberRow(m)),
      ...buildPaginationMeta(total, query.page, query.limit)
    };
  }

  /** Read-only roster for regular members — accessible by any user assigned to this project. */
  async getMemberTeamRoster(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    query: ListProjectTeamQuery
  ) {
    await this.access.assertCanAccessProject(workspaceId, userId, role, projectId);
    const team = await this.ensureTeam(projectId);

    const memberWhere = {
      teamId: team.id,
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { email: { contains: query.search, mode: "insensitive" as const } }
              ]
            }
          }
        : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.teamMember.count({ where: memberWhere }),
      this.prisma.teamMember.findMany({
        where: memberWhere,
        include: { user: true },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    const { page, limit, totalPages } = buildPaginationMeta(total, query.page, query.limit);
    return {
      items: rows.map((m) => this.mapTeamMemberRow(m)),
      page,
      limit,
      total,
      totalPages
    };
  }

  async addTeamMember(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    dto: AddTeamMemberDto,
    options?: { suppressAssignmentEmail?: boolean }
  ) {
    const project = await this.requireManageProject(
      workspaceId,
      userId,
      role,
      projectId,
      "project:ManageTeam"
    );
    const workspaceMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: dto.userId } }
    });
    if (!workspaceMember) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "User is not a member of this workspace",
        HttpStatus.FORBIDDEN
      );
    }

    const team = await this.ensureTeam(projectId);
    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: dto.userId } }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.MEMBER_ALREADY_EXISTS,
        "Already on this project team",
        HttpStatus.CONFLICT
      );
    }

    const created = await this.prisma.teamMember.create({
      data: { teamId: team.id, userId: dto.userId },
      include: { user: true }
    });

    void this.notificationsDispatch
      .notify({
        userId: dto.userId,
        workspaceId,
        templateId: "project.assigned",
        context: { projectName: project.name, projectId },
        ...(options?.suppressAssignmentEmail ? { forceChannels: { email: false } } : {})
      })
      .catch(() => undefined);

    return this.mapTeamMemberRow(created);
  }

  /**
   * Chip “Invite & add” — enqueue the same Bull job as Excel/CSV upload.
   * Workspace + project membership and emails run asynchronously (MAIL queue).
   */
  async provisionTeamMembers(
    workspaceId: string,
    actorUserId: string,
    actorRole: "ADMIN" | "MEMBER",
    projectId: string,
    dto: ProvisionProjectTeamMembersDto
  ): Promise<ProvisionProjectTeamMembersResponseDto> {
    return this.enqueueBulkProjectInvite(
      workspaceId,
      actorUserId,
      actorRole,
      projectId,
      dto.members.map((m) => ({
        email: m.email,
        name: m.name,
        role: "MEMBER" as const
      }))
    );
  }

  async generateBulkProjectInviteTemplate(
    workspaceId: string,
    actorUserId: string,
    actorRole: "ADMIN" | "MEMBER",
    projectId: string,
    res: Response
  ) {
    await this.requireManageProject(
      workspaceId,
      actorUserId,
      actorRole,
      projectId,
      "project:ManageTeam"
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Project invites");
    sheet.columns = [
      { header: "Email", key: "email", width: 34 },
      { header: "Name", key: "name", width: 28 }
    ];
    sheet.addRow({ email: "ada@example.com", name: "Ada Lovelace" });
    sheet.addRow({ email: "bob@example.com", name: "Bob Builder" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=project_team_invite_template.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  }

  async parseBulkProjectInviteFile(buffer: Buffer, filename?: string): Promise<InviteMemberDto[]> {
    const lower = (filename ?? "").toLowerCase();
    if (lower.endsWith(".csv") || looksLikeCsv(buffer)) {
      return parseProjectInviteCsv(buffer);
    }
    return this.parseBulkProjectInviteExcel(buffer);
  }

  private async parseBulkProjectInviteExcel(buffer: Buffer): Promise<InviteMemberDto[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Excel file is empty",
        HttpStatus.BAD_REQUEST
      );
    }

    const members: InviteMemberDto[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const email = row.getCell(1).text?.trim();
      const name = row.getCell(2).text?.trim();
      if (!email) return;
      members.push({
        email,
        name: name || email.split("@")[0] || email,
        role: "MEMBER"
      });
    });
    return assertBulkInviteMembers(members);
  }

  async enqueueBulkProjectInvite(
    workspaceId: string,
    actorUserId: string,
    actorRole: "ADMIN" | "MEMBER",
    projectId: string,
    members: InviteMemberDto[]
  ): Promise<ProvisionProjectTeamMembersResponseDto> {
    await this.requireManageProject(
      workspaceId,
      actorUserId,
      actorRole,
      projectId,
      "project:ManageTeam"
    );

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }

    const emails = members.map((m) => m.email.trim().toLowerCase());
    await this.planLimit.assertSeatsForEmails((workspace as { tenantId: string }).tenantId, emails);

    const normalized = members.map((m) => ({
      email: m.email.trim().toLowerCase(),
      name: m.name.trim(),
      role: "MEMBER" as const
    }));

    const job = await this.bulkInviteQueue.add(
      "bulkProjectInviteJob",
      {
        workspaceId,
        projectId,
        members: normalized,
        invitedByUserId: actorUserId
      },
      {
        // Keep finished jobs briefly so the admin UI can poll for outcome.
        removeOnComplete: { age: 60 * 60, count: 200 },
        removeOnFail: { age: 24 * 60 * 60, count: 200 }
      }
    );

    return {
      jobId: String(job.id!),
      status: "queued" as const,
      enqueuedCount: normalized.length
    };
  }

  async getBulkInviteJobStatus(
    workspaceId: string,
    actorUserId: string,
    actorRole: "ADMIN" | "MEMBER",
    projectId: string,
    jobId: string
  ): Promise<BulkInviteJobStatusDto> {
    await this.requireManageProject(
      workspaceId,
      actorUserId,
      actorRole,
      projectId,
      "project:ManageTeam"
    );

    const job = await this.bulkInviteQueue.getJob(jobId);
    if (!job) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Invite job not found", HttpStatus.NOT_FOUND);
    }

    const data = job.data as {
      workspaceId?: string;
      projectId?: string;
    };
    if (data.workspaceId !== workspaceId || data.projectId !== projectId) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Invite job not found", HttpStatus.NOT_FOUND);
    }

    const state = await job.getState();
    if (state === "completed") {
      const result = job.returnvalue as BulkInviteJobStatusDto["result"];
      return {
        jobId,
        status: "completed",
        ...(result
          ? {
              result: {
                successCount: Number(result.successCount ?? 0),
                skippedCount: Number(result.skippedCount ?? 0),
                projectAddedCount: Number(result.projectAddedCount ?? 0),
                totalProcessed: Number(result.totalProcessed ?? 0),
                emailQueuedCount: Number(result.emailQueuedCount ?? 0),
                credentialsResentCount: Number(result.credentialsResentCount ?? 0),
                emailFailedCount: Number(result.emailFailedCount ?? 0)
              }
            }
          : {})
      };
    }
    if (state === "failed") {
      return {
        jobId,
        status: "failed",
        failedReason: String(job.failedReason ?? "Invite job failed").slice(0, 500)
      };
    }
    if (state === "active") {
      return { jobId, status: "active" };
    }
    return { jobId, status: "queued" };
  }

  async updateTeamMember(
    workspaceId: string,
    projectId: string,
    memberId: string,
    dto: UpdateTeamMemberDto,
    actorRole: "ADMIN" | "MEMBER",
    actorUserId: string
  ) {
    await this.access.assertCanManageProject(
      workspaceId,
      actorUserId,
      actorRole,
      projectId,
      "project:ManageTeam"
    );
    if (dto.role !== undefined && actorRole !== "ADMIN") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Only workspace admins can change project manager roles",
        HttpStatus.FORBIDDEN
      );
    }
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { tenantId: true }
    });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }
    const team = await this.ensureTeam(projectId);
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId: team.id }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Team member not found",
        HttpStatus.NOT_FOUND
      );
    }
    if (
      dto.role === "MEMBER" &&
      member.role === "PROJECT_MANAGER" &&
      actorRole !== "ADMIN" &&
      member.userId !== actorUserId
    ) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Project managers cannot demote other project managers",
        HttpStatus.FORBIDDEN
      );
    }

    if (dto.isActive === true) {
      const workspaceMember = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: member.userId } }
      });
      if (!workspaceMember || !workspaceMember.isActive) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "User must be an active workspace member before they can be activated on a project",
          HttpStatus.FORBIDDEN
        );
      }
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM projects WHERE id = ${projectId} AND workspace_id = ${workspaceId} FOR UPDATE`;
      const lockedMember = await tx.teamMember.findFirst({
        where: { id: memberId, teamId: team.id }
      });
      if (!lockedMember) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Team member not found",
          HttpStatus.NOT_FOUND
        );
      }

      const roleChanged = dto.role !== undefined && dto.role !== lockedMember.role;
      if (roleChanged) {
        await this.roleGrantPolicy.assertProjectManagerGrant(
          {
            actorId: actorUserId,
            targetUserId: lockedMember.userId,
            tenantId: workspace.tenantId,
            workspaceId,
            projectId,
            currentRole: lockedMember.role as "MEMBER" | "PROJECT_MANAGER",
            requestedRole: dto.role!
          },
          tx
        );
      }

      const saved = await tx.teamMember.update({
        where: { id: memberId },
        data: {
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.role !== undefined && actorRole === "ADMIN" ? { role: dto.role } : {})
        },
        include: { user: true }
      });
      if (roleChanged) {
        await this.roleGrantAudit.record(tx, {
          actorUserId,
          targetUserId: lockedMember.userId,
          role: "PROJECT_MANAGER",
          scope: "project",
          resourceId: projectId,
          reason: "project_team_role_update",
          outcome: dto.role === "PROJECT_MANAGER" ? "GRANTED" : "REVOKED"
        });
      }
      return { saved, roleChanged };
    });
    const updated = outcome.saved;

    if (outcome.roleChanged) {
      await this.authRevocation.revokeUser(updated.userId);
    }

    if (dto.isActive === false && member.isActive !== false) {
      this.notifyProjectUnassigned(workspaceId, updated.userId, projectId, project.name);
    }

    return this.mapTeamMemberRow(updated);
  }

  async removeTeamMember(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    memberId: string
  ) {
    const project = await this.requireManageProject(
      workspaceId,
      userId,
      role,
      projectId,
      "project:ManageTeam"
    );
    const team = await this.ensureTeam(projectId);
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId: team.id }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Team member not found",
        HttpStatus.NOT_FOUND
      );
    }

    this.notifyProjectUnassigned(workspaceId, member.userId, projectId, project.name);
    await this.prisma.teamMember.delete({ where: { id: memberId } });
    return { ok: true };
  }

  async createTeamInvite(
    workspaceId: string,
    projectId: string,
    createdById: string,
    dto: CreateTeamInviteDto,
    actorRole: "ADMIN" | "MEMBER"
  ) {
    const project = await this.requireManageProject(
      workspaceId,
      createdById,
      actorRole,
      projectId,
      "project:ManageTeam"
    );
    await this.ensureTeam(projectId);
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.projectInvite.create({
      data: {
        projectId,
        token,
        email: dto.email ?? null,
        expiresAt,
        createdById
      }
    });

    const inviteUrl = `${this.appOrigin()}/invite/${token}`;
    return {
      id: invite.id,
      projectId,
      projectName: project.name,
      token,
      email: invite.email,
      inviteUrl,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: null
    };
  }

  async previewInvite(token: string) {
    const invite = await this.prisma.projectInvite.findUnique({
      where: { token },
      include: { project: { include: { workspace: true } } }
    });
    if (!invite) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Invite not found", HttpStatus.NOT_FOUND);
    }
    const expired = invite.expiresAt < new Date() || !!invite.acceptedAt;
    return {
      projectName: invite.project.name,
      workspaceName: invite.project.workspace.name,
      email: invite.email,
      expiresAt: invite.expiresAt.toISOString(),
      expired
    };
  }

  async acceptInviteForUser(token: string, userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.acceptInvite(token, userId, user.email);
  }

  async acceptInvite(token: string, userId: string, userEmail: string) {
    const invite = await this.prisma.projectInvite.findUnique({
      where: { token },
      include: { project: true }
    });
    if (!invite) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Invite not found", HttpStatus.NOT_FOUND);
    }
    if (invite.acceptedAt) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Invite already used",
        HttpStatus.CONFLICT
      );
    }
    if (invite.expiresAt < new Date()) {
      throw new DomainException(ErrorCodes.VALIDATION_ERROR, "Invite expired", HttpStatus.GONE);
    }
    if (invite.email && invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "This invite was sent to a different email address",
        HttpStatus.FORBIDDEN
      );
    }

    const workspaceMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.project.workspaceId,
          userId
        }
      }
    });
    if (!workspaceMember) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Join the workspace before accepting a team invite",
        HttpStatus.FORBIDDEN
      );
    }

    const team = await this.ensureTeam(invite.projectId);

    await this.prisma.$transaction([
      this.prisma.teamMember.upsert({
        where: {
          teamId_userId: { teamId: team.id, userId }
        },
        create: { teamId: team.id, userId },
        update: {}
      }),
      this.prisma.projectInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() }
      })
    ]);

    void this.notificationsDispatch
      .notify({
        userId,
        workspaceId: invite.project.workspaceId,
        templateId: "project.assigned",
        context: {
          projectName: invite.project.name,
          projectId: invite.projectId
        }
      })
      .catch(() => undefined);

    return {
      projectId: invite.projectId,
      projectName: invite.project.name
    };
  }
}

function looksLikeCsv(buffer: Buffer): boolean {
  const head = buffer.subarray(0, Math.min(buffer.length, 64)).toString("utf8").trimStart();
  return /^"?email"?\s*[,;]/i.test(head);
}

function parseProjectInviteCsv(buffer: Buffer): InviteMemberDto[] {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new DomainException(
      ErrorCodes.VALIDATION_ERROR,
      "CSV file is empty",
      HttpStatus.BAD_REQUEST
    );
  }

  const members: InviteMemberDto[] = [];
  const start = /^email\b/i.test(lines[0]!) ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!);
    const email = (cols[0] ?? "").trim();
    const name = (cols[1] ?? "").trim();
    if (!email) continue;
    members.push({
      email,
      name: name || email.split("@")[0] || email,
      role: "MEMBER"
    });
  }
  return assertBulkInviteMembers(members);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === "," || ch === ";") && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function assertBulkInviteMembers(members: InviteMemberDto[]): InviteMemberDto[] {
  if (members.length === 0) {
    throw new DomainException(
      ErrorCodes.VALIDATION_ERROR,
      "No valid members found in the file",
      HttpStatus.BAD_REQUEST
    );
  }
  if (members.length > 500) {
    throw new DomainException(
      ErrorCodes.VALIDATION_ERROR,
      "Maximum 500 members allowed per batch",
      HttpStatus.BAD_REQUEST
    );
  }
  return members;
}
