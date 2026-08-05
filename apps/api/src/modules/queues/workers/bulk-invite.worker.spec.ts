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
      create: vi.fn() as AnyMock,
      update: vi.fn() as AnyMock
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

const emptyEmailCounters = {
  emailQueuedCount: 0,
  credentialsResentCount: 0,
  emailFailedCount: 0
};

describe("BulkInviteWorker", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let worker: BulkInviteWorker;
  let mailQueue: { add: AnyMock };
  let auth: { prepareInviteHandoff: AnyMock };
  let notificationsDispatch: {
    notifyWorkspaceAdmins: AnyMock;
    notify: AnyMock;
  };
  let planLimit: { assertSeatsForEmails: AnyMock };

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
    planLimit = {
      assertSeatsForEmails: vi.fn().mockResolvedValue(undefined)
    };
    worker = new BulkInviteWorker(
      prisma as never,
      auth as never,
      notificationsDispatch as never,
      planLimit as never,
      mailQueue as never
    );
    prisma.workspace.findUnique.mockResolvedValue({
      id: "w1",
      name: "Acme",
      tenantId: "t-1"
    });
    prisma.user.findUnique.mockResolvedValue({ id: "inviter", name: "Inviter" });
    prisma.user.update.mockResolvedValue({});
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
      totalProcessed: 1,
      ...emptyEmailCounters
    });
  });

  it("creates membership for new emails and queues credentials mail", async () => {
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
    expect(mailQueue.add).toHaveBeenCalledWith(
      "sendNewMemberCredentials",
      expect.any(Object),
      expect.any(Object)
    );
    expect(result).toEqual({
      successCount: 1,
      skippedCount: 0,
      projectAddedCount: 0,
      totalProcessed: 1,
      emailQueuedCount: 1,
      credentialsResentCount: 0,
      emailFailedCount: 0
    });
  });

  it("checks seats before creating a user so orphans are not left behind", async () => {
    const { DomainException } = await import("../../../common/errors/domain.exception");
    const { ErrorCodes } = await import("@kloqra/contracts");
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "inviter", name: "Inviter" })
      .mockResolvedValueOnce(null);
    planLimit.assertSeatsForEmails
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new DomainException(ErrorCodes.PLAN_LIMIT_EXCEEDED, "Seat limit", 402)
      );

    const result = await worker.process({
      data: {
        workspaceId: "w1",
        invitedByUserId: "inviter",
        members: [{ email: "new@kloqra.dev", name: "New", role: "MEMBER" as const }]
      }
    } as never);

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      successCount: 0,
      skippedCount: 1,
      projectAddedCount: 0,
      totalProcessed: 1,
      ...emptyEmailCounters
    });
  });

  it("resends credentials for existing pending-password members instead of silent skip", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "inviter", name: "Inviter" })
      .mockResolvedValueOnce({
        id: "u-pending",
        email: "pending@kloqra.dev",
        name: "Pending",
        mustChangePassword: true
      });
    prisma.tenantMember.findUnique.mockResolvedValue(null);
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspace: { tenantId: "t-1" } });
    prisma.workspaceMember.findUnique.mockResolvedValue({
      id: "wm1",
      role: "MEMBER",
      workspaceId: "w1",
      userId: "u-pending"
    });

    const result = await worker.process({
      data: {
        workspaceId: "w1",
        invitedByUserId: "inviter",
        members: [{ email: "pending@kloqra.dev", name: "Pending", role: "MEMBER" as const }]
      }
    } as never);

    expect(prisma.user.update).toHaveBeenCalled();
    expect(mailQueue.add).toHaveBeenCalledWith(
      "sendNewMemberCredentials",
      expect.any(Object),
      expect.any(Object)
    );
    expect(result).toEqual({
      successCount: 0,
      skippedCount: 0,
      projectAddedCount: 0,
      totalProcessed: 1,
      emailQueuedCount: 1,
      credentialsResentCount: 1,
      emailFailedCount: 0
    });
  });

  it("counts emailFailedCount when mail enqueue fails after membership create", async () => {
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
    mailQueue.add.mockRejectedValueOnce(new Error("redis down"));

    const result = await worker.process({
      data: {
        workspaceId: "w1",
        invitedByUserId: "inviter",
        members: [{ email: "new@kloqra.dev", name: "New", role: "MEMBER" as const }]
      }
    } as never);

    expect(prisma.workspaceMember.create).toHaveBeenCalled();
    expect(result).toEqual({
      successCount: 1,
      skippedCount: 0,
      projectAddedCount: 0,
      totalProcessed: 1,
      emailQueuedCount: 0,
      credentialsResentCount: 0,
      emailFailedCount: 1
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
    expect(result).toEqual({
      successCount: 0,
      skippedCount: 0,
      projectAddedCount: 1,
      totalProcessed: 1,
      emailQueuedCount: 1,
      credentialsResentCount: 0,
      emailFailedCount: 0
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
    expect(result).toEqual({
      successCount: 1,
      skippedCount: 0,
      projectAddedCount: 1,
      totalProcessed: 1,
      emailQueuedCount: 1,
      credentialsResentCount: 0,
      emailFailedCount: 0
    });
  });
});
