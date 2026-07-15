import type { InviteMemberDto } from "@kloqra/contracts";
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
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue
  ) {
    super();
  }

  async process(job: Job<BulkInviteJobPayload, any, string>): Promise<any> {
    const { workspaceId, members, invitedByUserId, projectId } = job.data;

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error("Workspace not found");

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

    for (const memberDto of members) {
      const email = memberDto.email.trim().toLowerCase();
      // Project bulk always provisions as workspace MEMBER (admin role belongs elsewhere).
      const workspaceRole = projectId ? "MEMBER" : memberDto.role;

      let user = await this.prisma.user.findUnique({ where: { email } });
      let userCreated = false;
      let temporaryPassword: string | undefined;

      if (!user) {
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
          await assertUserNotInOtherTenant(this.prisma, user.id, (workspace as any).tenantId);
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
          skippedCount++;
          continue; // Gracefully skip existing members (workspace-only bulk)
        }
      } else {
        const membership = await this.prisma.workspaceMember.create({
          data: { workspaceId, userId: user.id, role: workspaceRole },
          include: { user: true }
        });
        workspaceInvited = true;
        successCount++;

        if (userCreated && temporaryPassword) {
          const inviteHandoff = await this.auth.prepareInviteHandoff(user.id, temporaryPassword);
          if (projectId && project) {
            await this.mailQueue.add(
              "sendProjectInviteWelcome",
              {
                type: "sendProjectInviteWelcome",
                payload: {
                  to: email,
                  workspaceName: workspace.name,
                  projectName: project.name,
                  inviterName,
                  temporaryPassword,
                  inviteHandoffToken: inviteHandoff.inviteHandoffToken
                }
              },
              { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
            );
          } else {
            await this.mailQueue.add(
              "sendNewMemberCredentials",
              {
                type: "sendNewMemberCredentials",
                payload: {
                  to: email,
                  workspaceName: workspace.name,
                  inviterName,
                  temporaryPassword,
                  inviteHandoffToken: inviteHandoff.inviteHandoffToken,
                  role: workspaceRole
                }
              },
              { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
            );
          }
        } else if (projectId && project) {
          await this.mailQueue.add(
            "sendProjectInviteExisting",
            {
              type: "sendProjectInviteExisting",
              payload: {
                to: email,
                workspaceName: workspace.name,
                projectName: project.name,
                inviterName,
                workspaceJoined: true
              }
            },
            { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
          );
        } else {
          await this.mailQueue.add(
            "sendWorkspaceAdded",
            {
              type: "sendWorkspaceAdded",
              payload: {
                to: email,
                workspaceName: workspace.name,
                inviterName,
                role: workspaceRole
              }
            },
            { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
          );
        }

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
          await this.mailQueue.add(
            "sendProjectInviteExisting",
            {
              type: "sendProjectInviteExisting",
              payload: {
                to: email,
                workspaceName: workspace.name,
                projectName: project.name,
                inviterName,
                workspaceJoined: false
              }
            },
            { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
          );
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
    }

    return {
      successCount,
      skippedCount,
      projectAddedCount,
      totalProcessed: members.length
    };
  }
}
