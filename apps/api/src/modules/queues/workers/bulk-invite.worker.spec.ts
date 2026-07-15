import { describe, expect, it, vi, beforeEach } from "vitest";
import { BulkInviteWorker } from "./bulk-invite.worker";

type AnyMock = ReturnType<typeof vi.fn>;

vi.mock("../../../common/auth/password.util", () => ({
  generateTempPassword: vi.fn().mockReturnValue("TempPass123!"),
  hashPassword: vi.fn().mockResolvedValue("hashed-temp")
}));

function makePrisma() {
  return {
    workspace: {
      findUnique: vi.fn() as AnyMock
    },
    project: {
      findFirst: vi.fn() as AnyMock
    },
    team: {
      findUnique: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock
    },
    teamMember: {
      findUnique: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock
    },
    user: {
      findUnique: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock
    },
    workspaceMember: {
      findUnique: vi.fn() as AnyMock,
      findFirst: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock
    },
    tenantMember: {
      findUnique: vi.fn() as AnyMock
    }
  };
}

describe("BulkInviteWorker", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let worker: BulkInviteWorker;
  let mailQueue: { add: AnyMock };
  let auth: { prepareInviteHandoff: AnyMock };
  let notificationsDispatch: {
    notifyWorkspaceAdmins: AnyMock;
    notify: AnyMock;
  };

  beforeEach(() => {
    prisma = makePrisma();
    mailQueue = { add: vi.fn().mockResolvedValue({ id: "mail-1" }) };
    auth = {
      prepareInviteHandoff: vi.fn().mockResolvedValue({ inviteHandoffToken: "token" })
    };
    notificationsDispatch = {
      notifyWorkspaceAdmins: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn().mockResolvedValue(undefined)
    };
    worker = new BulkInviteWorker(
      prisma as never,
      auth as never,
      notificationsDispatch as never,
      mailQueue as never
    );
    prisma.workspace.findUnique.mockResolvedValue({
      id: "w1",
      name: "Acme",
      tenantId: "t-1"
    });
    prisma.user.findUnique.mockResolvedValue({ id: "inviter", name: "Inviter" });
  });

  it("skips users who already belong to another organization", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "inviter", name: "Inviter" })
      .mockResolvedValueOnce({ id: "u-other", email: "other@kloqra.dev" });
    prisma.tenantMember.findUnique.mockResolvedValue({ tenantId: "t-other" });

    const result = await worker.process({
      data: {
        workspaceId: "w1",
        invitedByUserId: "inviter",
        members: [{ email: "other@kloqra.dev", name: "Other", role: "MEMBER" as const }]
      }
    } as never);

    expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      successCount: 0,
      skippedCount: 1,
      projectAddedCount: 0,
      totalProcessed: 1
    });
  });

  it("creates membership for new emails", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "inviter", name: "Inviter" })
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue({
      id: "u-new",
      email: "new@kloqra.dev",
      name: "New"
    });
    prisma.workspaceMember.findUnique.mockResolvedValue(null);
    prisma.workspaceMember.create.mockResolvedValue({
      id: "m1",
      user: { name: "New", email: "new@kloqra.dev" }
    });

    const result = await worker.process({
      data: {
        workspaceId: "w1",
        invitedByUserId: "inviter",
        members: [{ email: "new@kloqra.dev", name: "New", role: "MEMBER" as const }]
      }
    } as never);

    expect(prisma.workspaceMember.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      successCount: 1,
      skippedCount: 0,
      projectAddedCount: 0,
      totalProcessed: 1
    });
  });

  it("with projectId adds existing workspace members onto the project team", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "inviter", name: "Inviter" })
      .mockResolvedValueOnce({ id: "u-existing", email: "existing@kloqra.dev", name: "Existing" });
    prisma.project.findFirst.mockResolvedValue({
      id: "p1",
      name: "Alpha",
      workspaceId: "w1"
    });
    prisma.team.findUnique.mockResolvedValue({ id: "team-1", projectId: "p1" });
    prisma.workspaceMember.findUnique.mockResolvedValue({
      id: "wm1",
      workspaceId: "w1",
      userId: "u-existing"
    });
    prisma.workspaceMember.findFirst.mockResolvedValue({
      workspace: { tenantId: "t-1" }
    });
    prisma.tenantMember.findUnique.mockResolvedValue(null);
    prisma.teamMember.findUnique.mockResolvedValue(null);
    prisma.teamMember.create.mockResolvedValue({ id: "tm1" });

    const result = await worker.process({
      data: {
        workspaceId: "w1",
        projectId: "p1",
        invitedByUserId: "inviter",
        members: [{ email: "existing@kloqra.dev", name: "Existing", role: "MEMBER" as const }]
      }
    } as never);

    expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
    expect(prisma.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: "team-1", userId: "u-existing" }
    });
    expect(notificationsDispatch.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "project.assigned",
        forceChannels: { email: false }
      })
    );
    expect(mailQueue.add).toHaveBeenCalledWith(
      "sendProjectInviteExisting",
      expect.objectContaining({
        type: "sendProjectInviteExisting",
        payload: expect.objectContaining({
          to: "existing@kloqra.dev",
          projectName: "Alpha",
          workspaceJoined: false
        })
      }),
      expect.any(Object)
    );
    expect(result).toEqual({
      successCount: 0,
      skippedCount: 0,
      projectAddedCount: 1,
      totalProcessed: 1
    });
  });

  it("with projectId queues combined welcome email for brand-new users", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "inviter", name: "Inviter" })
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue({
      id: "u-new",
      email: "new@kloqra.dev",
      name: "New"
    });
    prisma.project.findFirst.mockResolvedValue({
      id: "p1",
      name: "Alpha",
      workspaceId: "w1"
    });
    prisma.team.findUnique.mockResolvedValue({ id: "team-1", projectId: "p1" });
    prisma.workspaceMember.findUnique.mockResolvedValue(null);
    prisma.workspaceMember.create.mockResolvedValue({
      id: "m1",
      user: { name: "New", email: "new@kloqra.dev" }
    });
    prisma.teamMember.findUnique.mockResolvedValue(null);
    prisma.teamMember.create.mockResolvedValue({ id: "tm1" });

    const result = await worker.process({
      data: {
        workspaceId: "w1",
        projectId: "p1",
        invitedByUserId: "inviter",
        members: [{ email: "new@kloqra.dev", name: "New", role: "MEMBER" as const }]
      }
    } as never);

    expect(mailQueue.add).toHaveBeenCalledWith(
      "sendProjectInviteWelcome",
      expect.objectContaining({
        type: "sendProjectInviteWelcome",
        payload: expect.objectContaining({
          to: "new@kloqra.dev",
          projectName: "Alpha",
          temporaryPassword: "TempPass123!"
        })
      }),
      expect.any(Object)
    );
    expect(mailQueue.add).not.toHaveBeenCalledWith(
      "sendNewMemberCredentials",
      expect.anything(),
      expect.anything()
    );
    expect(notificationsDispatch.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "project.assigned",
        forceChannels: { email: false }
      })
    );
    expect(result).toEqual({
      successCount: 1,
      skippedCount: 0,
      projectAddedCount: 1,
      totalProcessed: 1
    });
  });
});
