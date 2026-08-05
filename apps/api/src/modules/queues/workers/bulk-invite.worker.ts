import type { BulkInviteJobResultDto, InviteMemberDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { Processor, WorkerHost, InjectQueue } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { generateTempPassword, hashPassword } from "../../../common/auth/password.util";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import { assertUserNotInOtherTenant } from "../../../common/tenant/assert-user-not-in-other-tenant";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";
import { PlanLimitService } from "../../subscriptions/application/plan-limit.service";
import { splitDisplayName } from "../../users/application/user-name.util";

export interface BulkInviteJobPayload {
  workspaceId: string;
  members: InviteMemberDto[];
  invitedByUserId: string;
  /** When set, also add each member to this project team after workspace membership. */
  projectId?: string;
}

@Processor(QUEUES.BULK_INVITE)
export class BulkInviteWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly notificationsDispatch: NotificationsDispatchService,
    private readonly planLimit: PlanLimitService,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue
  ) {
    super();
  }

  async process(job: Job<BulkInviteJobPayload, any, string>): Promise<BulkInviteJobResultDto> {
    const { workspaceId, members, invitedByUserId, projectId } = job.data;

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error("Workspace not found");
    const tenantId = (workspace as { tenantId?: string }).tenantId;
    if (!tenantId) throw new Error("Workspace is not linked to an organization");

    // Re-check seats at run time (enqueue check can race with concurrent invites).
    await this.planLimit.assertSeatsForEmails(
      tenantId,
      members.map((m) => m.email.trim().toLowerCase())
    );

    let project: { id: string; name: string; workspaceId: string } | null = null;
    let teamId: string | null = null;
    if (projectId) {
      project = await this.prisma.project.findFirst({
        where: { id: projectId, workspaceId },
        select: { id: true, name: true, workspaceId: true }
      });
      if (!project) throw new Error("Project not found in workspace");
      let team = await this.prisma.team.findUnique({ where: { projectId } });
      if (!team) {
        team = await this.prisma.team.create({ data: { projectId } });
      }
      teamId = team.id;
    }

    const inviter = await this.prisma.user.findUnique({ where: { id: invitedByUserId } });
    const inviterName = inviter?.name;

    let successCount = 0;
    let skippedCount = 0;
    let projectAddedCount = 0;
    let emailQueuedCount = 0;
    let credentialsResentCount = 0;
    let emailFailedCount = 0;

    for (const memberDto of members) {
      try {
        const email = memberDto.email.trim().toLowerCase();
        // Project bulk always provisions as workspace MEMBER (admin role belongs elsewhere).
        const workspaceRole = projectId ? "MEMBER" : memberDto.role;

        let user = await this.prisma.user.findUnique({ where: { email } });
        let userCreated = false;
        let temporaryPassword: string | undefined;

        if (!user) {
          // Seat check BEFORE create — never leave orphan users when seats are exhausted.
          try {
            await this.planLimit.assertSeatsForEmails(tenantId, [email]);
          } catch (err) {
            if (err instanceof DomainException && err.code === ErrorCodes.PLAN_LIMIT_EXCEEDED) {
              skippedCount++;
              continue;
            }
            throw err;
          }

          const displayName = memberDto.name.trim();
          const { firstName, lastName } = splitDisplayName(displayName);
          temporaryPassword = generateTempPassword();
          const passwordHash = await hashPassword(temporaryPassword);

          user = await this.prisma.user.create({
            data: {
              email,
              passwordHash,
              name: displayName,
              firstName,
              lastName,
              mustChangePassword: true,
              emailVerifiedAt: null
            }
          });
          userCreated = true;
        } else {
          try {
            await assertUserNotInOtherTenant(this.prisma, user.id, tenantId);
          } catch (err) {
            if (err instanceof DomainException && err.code === ErrorCodes.CONFLICT) {
              skippedCount++;
              continue;
            }
            throw err;
          }
        }

        const existing = await this.prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: user.id } }
        });

        let workspaceInvited = false;
        if (existing) {
          if (!projectId) {
            // Re-bulk of pending members: resend credentials instead of silent skip.
            if (user.mustChangePassword) {
              const resent = await this.enqueueFreshCredentials({
                userId: user.id,
                email,
                workspaceName: workspace.name,
                inviterName,
                role: existing.role === "ADMIN" ? "ADMIN" : "MEMBER",
                projectId: undefined,
                projectName: undefined
              });
              if (resent) {
                credentialsResentCount++;
                emailQueuedCount++;
              } else {
                emailFailedCount++;
                skippedCount++;
              }
              continue;
            }
            skippedCount++;
            continue;
          }
        } else {
          if (!userCreated) {
            try {
              await this.planLimit.assertSeatsForEmails(tenantId, [email]);
            } catch (err) {
              if (err instanceof DomainException && err.code === ErrorCodes.PLAN_LIMIT_EXCEEDED) {
                skippedCount++;
                continue;
              }
              throw err;
            }
          }

          const membership = await this.prisma.workspaceMember.create({
            data: { workspaceId, userId: user.id, role: workspaceRole },
            include: { user: true }
          });
          workspaceInvited = true;
          successCount++;

          const mailOk = await this.enqueueInviteMail({
            email,
            workspaceName: workspace.name,
            inviterName,
            workspaceRole,
            userCreated,
            temporaryPassword,
            userId: user.id,
            projectId,
            project
          });
          if (mailOk) emailQueuedCount++;
          else emailFailedCount++;

          void this.notificationsDispatch
            .notifyWorkspaceAdmins(workspaceId, {
              templateId: "member.joined",
              context: {
                memberName: membership.user.name,
                workspaceName: workspace.name,
                inviterName: inviterName
              }
            })
            .catch(() => undefined);

          void this.notificationsDispatch
            .notify({
              userId: user.id,
              workspaceId,
              templateId: "workspace.added",
              context: {
                workspaceName: workspace.name,
                inviterName
              }
            })
            .catch(() => undefined);
        }

        if (projectId && teamId && project) {
          const onTeam = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: user.id } }
          });
          if (onTeam) {
            if (!workspaceInvited) skippedCount++;
            continue;
          }
          await this.prisma.teamMember.create({
            data: { teamId, userId: user.id }
          });
          projectAddedCount++;

          if (!workspaceInvited) {
            const mailOk = await this.safeMailAdd("sendProjectInviteExisting", {
              type: "sendProjectInviteExisting",
              payload: {
                to: email,
                workspaceName: workspace.name,
                projectName: project.name,
                inviterName,
                workspaceJoined: false
              }
            });
            if (mailOk) emailQueuedCount++;
            else emailFailedCount++;
          }

          void this.notificationsDispatch
            .notify({
              userId: user.id,
              workspaceId,
              templateId: "project.assigned",
              context: { projectName: project.name, projectId: project.id },
              forceChannels: { email: false }
            })
            .catch(() => undefined);
        }
      } catch {
        // Keep remaining rows moving — one bad email must not abort the batch.
        skippedCount++;
      }
    }

    return {
      successCount,
      skippedCount,
      projectAddedCount,
      totalProcessed: members.length,
      emailQueuedCount,
      credentialsResentCount,
      emailFailedCount
    };
  }

  private async enqueueInviteMail(input: {
    email: string;
    workspaceName: string;
    inviterName?: string;
    workspaceRole: "ADMIN" | "MEMBER";
    userCreated: boolean;
    temporaryPassword?: string;
    userId: string;
    projectId?: string;
    project: { id: string; name: string } | null;
  }): Promise<boolean> {
    if (input.userCreated && input.temporaryPassword) {
      return this.enqueueFreshCredentials({
        userId: input.userId,
        email: input.email,
        workspaceName: input.workspaceName,
        inviterName: input.inviterName,
        role: input.workspaceRole,
        projectId: input.projectId,
        projectName: input.project?.name,
        temporaryPassword: input.temporaryPassword
      });
    }
    if (input.projectId && input.project) {
      return this.safeMailAdd("sendProjectInviteExisting", {
        type: "sendProjectInviteExisting",
        payload: {
          to: input.email,
          workspaceName: input.workspaceName,
          projectName: input.project.name,
          inviterName: input.inviterName,
          workspaceJoined: true
        }
      });
    }
    return this.safeMailAdd("sendWorkspaceAdded", {
      type: "sendWorkspaceAdded",
      payload: {
        to: input.email,
        workspaceName: input.workspaceName,
        inviterName: input.inviterName,
        role: input.workspaceRole
      }
    });
  }

  private async enqueueFreshCredentials(input: {
    userId: string;
    email: string;
    workspaceName: string;
    inviterName?: string;
    role: "ADMIN" | "MEMBER";
    projectId?: string;
    projectName?: string;
    temporaryPassword?: string;
  }): Promise<boolean> {
    const temporaryPassword = input.temporaryPassword ?? generateTempPassword();
    if (!input.temporaryPassword) {
      await this.prisma.user.update({
        where: { id: input.userId },
        data: {
          passwordHash: await hashPassword(temporaryPassword),
          mustChangePassword: true
        }
      });
    }
    const inviteHandoff = await this.auth.prepareInviteHandoff(input.userId, temporaryPassword);
    if (input.projectId && input.projectName) {
      return this.safeMailAdd("sendProjectInviteWelcome", {
        type: "sendProjectInviteWelcome",
        payload: {
          to: input.email,
          workspaceName: input.workspaceName,
          projectName: input.projectName,
          inviterName: input.inviterName,
          temporaryPassword,
          inviteHandoffToken: inviteHandoff.inviteHandoffToken
        }
      });
    }
    return this.safeMailAdd("sendNewMemberCredentials", {
      type: "sendNewMemberCredentials",
      payload: {
        to: input.email,
        workspaceName: input.workspaceName,
        inviterName: input.inviterName,
        temporaryPassword,
        inviteHandoffToken: inviteHandoff.inviteHandoffToken,
        role: input.role
      }
    });
  }

  private async safeMailAdd(name: string, data: unknown): Promise<boolean> {
    try {
      await this.mailQueue.add(name, data, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 }
      });
      return true;
    } catch {
      return false;
    }
  }
}
