import type { PrismaService } from "./prisma.service";

/** Row shapes for integration tables — stable if IDE Prisma client is stale (run `prisma generate`). */
export type JiraConnectionRow = {
  id: string;
  workspaceId: string;
  cloudId: string;
  siteUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  connectedById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type JiraProjectMappingRow = {
  id: string;
  workspaceId: string;
  jiraProjectKey: string;
  chronomintProjectId: string;
  autoCreateTasks: boolean;
  defaultCategoryId: string;
  createdAt: Date;
  updatedAt: Date;
  project?: { name: string } | null;
};

export type JiraIssueLinkRow = {
  id: string;
  workspaceId: string;
  jiraIssueKey: string;
  jiraIssueId: string;
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
  task?: { id: string; taskName: string; projectId: string } | null;
};

export type PersonalAccessTokenRow = {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  tokenHash: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  user?: {
    memberships: Array<{ workspaceId: string; role: string }>;
  };
};

type IntegrationPrismaDb = {
  jiraConnection: {
    findUnique: (args: { where: { workspaceId: string } }) => Promise<JiraConnectionRow | null>;
    upsert: (args: {
      where: { workspaceId: string };
      create: Omit<JiraConnectionRow, "id" | "createdAt" | "updatedAt">;
      update: Partial<Omit<JiraConnectionRow, "id" | "workspaceId" | "createdAt" | "updatedAt">>;
    }) => Promise<JiraConnectionRow>;
    deleteMany: (args: { where: { workspaceId: string } }) => Promise<{ count: number }>;
    update: (args: {
      where: { workspaceId: string };
      data: Partial<Pick<JiraConnectionRow, "accessToken" | "refreshToken" | "expiresAt">>;
    }) => Promise<JiraConnectionRow>;
  };
  jiraProjectMapping: {
    findMany: (args: {
      where: { workspaceId: string };
      include?: { project: { select: { name: true } } };
      orderBy?: { jiraProjectKey: "asc" };
    }) => Promise<JiraProjectMappingRow[]>;
    findUnique: (args: {
      where: { workspaceId_jiraProjectKey: { workspaceId: string; jiraProjectKey: string } };
    }) => Promise<JiraProjectMappingRow | null>;
    upsert: (args: {
      where: { workspaceId_jiraProjectKey: { workspaceId: string; jiraProjectKey: string } };
      create: Omit<JiraProjectMappingRow, "id" | "createdAt" | "updatedAt" | "project">;
      update: Partial<
        Omit<
          JiraProjectMappingRow,
          "id" | "workspaceId" | "jiraProjectKey" | "createdAt" | "updatedAt" | "project"
        >
      >;
    }) => Promise<JiraProjectMappingRow>;
  };
  jiraIssueLink: {
    findUnique: (args: {
      where: { workspaceId_jiraIssueKey: { workspaceId: string; jiraIssueKey: string } };
      include?: { task: { select: { id: true; taskName: true; projectId: true } } };
    }) => Promise<JiraIssueLinkRow | null>;
    create: (args: {
      data: {
        workspaceId: string;
        jiraIssueKey: string;
        jiraIssueId: string;
        taskId: string;
      };
    }) => Promise<JiraIssueLinkRow>;
  };
  personalAccessToken: {
    findMany: (args: {
      where: { userId: string; workspaceId: string; revokedAt: null };
      orderBy: { createdAt: "desc" };
    }) => Promise<PersonalAccessTokenRow[]>;
    create: (args: {
      data: { userId: string; workspaceId: string; name: string; tokenHash: string };
    }) => Promise<PersonalAccessTokenRow>;
    findFirst: (args: {
      where: { id: string; userId: string; workspaceId: string; revokedAt: null };
    }) => Promise<PersonalAccessTokenRow | null>;
    findUnique: (args: {
      where: { tokenHash: string };
      include?: { user: { include: { memberships: true } } };
    }) => Promise<PersonalAccessTokenRow | null>;
    update: (args: {
      where: { id: string };
      data: { revokedAt?: Date; lastUsedAt?: Date };
    }) => Promise<PersonalAccessTokenRow>;
  };
};

/** Integration Prisma delegates — use when schema models are newer than the IDE Prisma client. */
export function integrationPrisma(prisma: PrismaService): IntegrationPrismaDb {
  return prisma as unknown as IntegrationPrismaDb;
}
