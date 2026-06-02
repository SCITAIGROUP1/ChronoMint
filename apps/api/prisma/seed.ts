import { PrismaClient, type Project, type Task, type Team, type User, type Workspace } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PASSWORD = "password123";
/** Weeks of history for dashboards and export date-range tests */
const HISTORY_WEEKS = 14;

type SeedUser = { email: string; name: string; defaultHourlyRate: number; role: "ADMIN" | "MEMBER" };

type SeedProject = {
  name: string;
  color: string;
  clientName: string | null;
  budgetHours: number | null;
  tasks: { name: string; billableDefault: boolean }[];
  memberEmails: string[];
};

const DEMO_USERS: SeedUser[] = [
  { email: "admin@chronomint.dev", name: "Admin User", defaultHourlyRate: 150, role: "ADMIN" },
  { email: "member@chronomint.dev", name: "Sam Rivera", defaultHourlyRate: 100, role: "MEMBER" },
  { email: "alex@chronomint.dev", name: "Alex Chen", defaultHourlyRate: 95, role: "MEMBER" },
  { email: "jordan@chronomint.dev", name: "Jordan Lee", defaultHourlyRate: 110, role: "MEMBER" }
];

const DEMO_PROJECTS: SeedProject[] = [
  {
    name: "Acme Website",
    color: "#6366f1",
    clientName: "Acme Corp",
    budgetHours: 120,
    tasks: [
      { name: "Frontend development", billableDefault: true },
      { name: "API integration", billableDefault: true },
      { name: "Design review", billableDefault: true },
      { name: "Sprint planning", billableDefault: true }
    ],
    memberEmails: [
      "admin@chronomint.dev",
      "member@chronomint.dev",
      "alex@chronomint.dev",
      "jordan@chronomint.dev"
    ]
  },
  {
    name: "Beta Mobile App",
    color: "#0ea5e9",
    clientName: "Beta Inc",
    budgetHours: 200,
    tasks: [
      { name: "iOS features", billableDefault: true },
      { name: "Push notifications", billableDefault: true },
      { name: "Android parity", billableDefault: true }
    ],
    memberEmails: ["admin@chronomint.dev", "member@chronomint.dev", "jordan@chronomint.dev"]
  },
  {
    name: "Internal R&D",
    color: "#10b981",
    clientName: null,
    budgetHours: null,
    tasks: [
      { name: "Spike research", billableDefault: false },
      { name: "Team sync", billableDefault: false },
      { name: "Prototype", billableDefault: false }
    ],
    memberEmails: [
      "admin@chronomint.dev",
      "member@chronomint.dev",
      "alex@chronomint.dev",
      "jordan@chronomint.dev"
    ]
  },
  {
    name: "Gamma Rebrand",
    color: "#f59e0b",
    clientName: "Gamma LLC",
    budgetHours: 80,
    tasks: [
      { name: "Brand guidelines", billableDefault: true },
      { name: "Marketing site", billableDefault: true },
      { name: "Asset export", billableDefault: true }
    ],
    memberEmails: ["admin@chronomint.dev", "alex@chronomint.dev", "member@chronomint.dev"]
  },
  {
    name: "Delta Support",
    color: "#a855f7",
    clientName: "Delta Co",
    budgetHours: 60,
    tasks: [
      { name: "Ticket triage", billableDefault: true },
      { name: "Hotfix", billableDefault: true }
    ],
    memberEmails: ["admin@chronomint.dev", "member@chronomint.dev", "jordan@chronomint.dev"]
  },
  {
    name: "Epsilon Docs",
    color: "#ec4899",
    clientName: "Epsilon Ltd",
    budgetHours: 40,
    tasks: [
      { name: "API reference", billableDefault: true },
      { name: "Tutorial videos", billableDefault: false }
    ],
    memberEmails: ["admin@chronomint.dev", "alex@chronomint.dev"]
  }
];

const DESCRIPTIONS = [
  "Sprint planning",
  "Implementation",
  "Code review",
  "Bug fix",
  "Client call",
  "Documentation",
  "Refactor",
  "QA pass",
  "Design handoff",
  "Deployment prep"
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = new Map<string, User>();

  for (const spec of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: { name: spec.name, defaultHourlyRate: spec.defaultHourlyRate },
      create: {
        email: spec.email,
        passwordHash,
        name: spec.name,
        defaultHourlyRate: spec.defaultHourlyRate
      }
    });
    users.set(spec.email, user);
  }

  const admin = users.get("admin@chronomint.dev")!;
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: { name: "Demo Workspace" },
    create: { name: "Demo Workspace", slug: "demo" }
  });

  const workspaceAcme = await prisma.workspace.upsert({
    where: { slug: "acme-agency" },
    update: {},
    create: { name: "Acme Agency", slug: "acme-agency" }
  });

  for (const spec of DEMO_USERS) {
    const user = users.get(spec.email)!;
    const role = spec.role;
    for (const ws of [workspace, workspaceAcme]) {
      if (
        ws.id === workspaceAcme.id &&
        role === "MEMBER" &&
        spec.email !== "member@chronomint.dev" &&
        spec.email !== "admin@chronomint.dev"
      ) {
        continue;
      }
      const acmeRole =
        ws.id === workspaceAcme.id && spec.email === "admin@chronomint.dev" ? "ADMIN" : role;
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: ws.id, userId: user.id } },
        update: { role: acmeRole },
        create: { workspaceId: ws.id, userId: user.id, role: acmeRole }
      });
    }
  }

  const projectCtx: {
    project: Project;
    tasks: Task[];
    team: Team;
  }[] = [];

  for (const spec of DEMO_PROJECTS) {
    const ctx = await ensureProjectWithTeam(workspace, spec, users);
    projectCtx.push(ctx);
  }

  await seedHourlyRates(workspace.id, users);

  await prisma.timeLog.deleteMany({
    where: { task: { project: { workspaceId: workspace.id } } }
  });

  const logCount = await seedTimeLogs(projectCtx, users);
  const adminWeekLogs = await seedAdminCurrentWeek(projectCtx, users.get("admin@chronomint.dev")!);
  const acmeLogs = await seedAcmeAgencySample(workspaceAcme, users.get("member@chronomint.dev")!, admin);

  console.log("Seed complete:", {
    workspace: workspace.slug,
    users: DEMO_USERS.map((u) => u.email),
    projects: DEMO_PROJECTS.map((p) => p.name),
    demoTimeLogs: logCount,
    adminCurrentWeekLogs: adminWeekLogs,
    acmeAgencyTimeLogs: acmeLogs,
    loginPassword: PASSWORD,
    exportHint: `Use ${workspace.slug} workspace, last ${HISTORY_WEEKS} weeks for analytics/export`
  });
}

async function seedHourlyRates(workspaceId: string, users: Map<string, User>) {
  const projects = await prisma.project.findMany({ where: { workspaceId } });
  const projectByName = new Map(projects.map((p) => [p.name, p.id]));

  const rates: {
    userEmail?: string;
    projectName?: string;
    rate: number;
    effectiveFrom: string;
  }[] = [
    { userEmail: "member@chronomint.dev", rate: 100, effectiveFrom: "2025-01-01" },
    { userEmail: "alex@chronomint.dev", rate: 95, effectiveFrom: "2025-01-01" },
    { userEmail: "jordan@chronomint.dev", rate: 110, effectiveFrom: "2025-01-01" },
    { projectName: "Acme Website", rate: 125, effectiveFrom: "2025-06-01" },
    { projectName: "Beta Mobile App", rate: 115, effectiveFrom: "2025-06-01" }
  ];

  for (const row of rates) {
    const userId = row.userEmail ? users.get(row.userEmail)?.id ?? null : null;
    const projectId = row.projectName ? projectByName.get(row.projectName) ?? null : null;
    const effectiveFrom = new Date(row.effectiveFrom);

    const existing = await prisma.hourlyRate.findFirst({
      where: { workspaceId, userId, projectId, effectiveFrom }
    });
    if (existing) continue;

    await prisma.hourlyRate.create({
      data: { workspaceId, userId, projectId, rate: row.rate, effectiveFrom }
    });
  }
}

async function ensureProjectWithTeam(
  workspace: Workspace,
  spec: SeedProject,
  users: Map<string, User>
) {
  const existing = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: spec.name }
  });

  const project = existing
    ? await prisma.project.update({
        where: { id: existing.id },
        data: {
          color: spec.color,
          clientName: spec.clientName,
          budgetHours: spec.budgetHours,
          isActive: true
        }
      })
    : await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          name: spec.name,
          color: spec.color,
          clientName: spec.clientName,
          budgetHours: spec.budgetHours,
          isActive: true
        }
      });

  const team =
    (await prisma.team.findUnique({ where: { projectId: project.id } })) ??
    (await prisma.team.create({ data: { projectId: project.id } }));

  for (const email of spec.memberEmails) {
    const user = users.get(email);
    if (!user) continue;
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
      update: { isActive: true },
      create: { teamId: team.id, userId: user.id, isActive: true }
    });
  }

  const tasks: Task[] = [];
  for (const taskSpec of spec.tasks) {
    let task = await prisma.task.findFirst({
      where: { projectId: project.id, taskName: taskSpec.name }
    });
    if (!task) {
      task = await prisma.task.create({
        data: {
          projectId: project.id,
          taskName: taskSpec.name,
          billableDefault: taskSpec.billableDefault
        }
      });
    } else if (task.billableDefault !== taskSpec.billableDefault) {
      task = await prisma.task.update({
        where: { id: task.id },
        data: { billableDefault: taskSpec.billableDefault }
      });
    }
    tasks.push(task);
  }

  return { project, tasks, team };
}

/** Deterministic pseudo-random in [0, 1) from day + slot indices */
function hash01(dayIndex: number, slot: number, salt: number): number {
  const x = Math.sin(dayIndex * 127.1 + slot * 311.7 + salt * 17.3) * 43758.5453;
  return x - Math.floor(x);
}

function utcWorkday(daysAgo: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setUTCHours(hour, minute, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function isWeekday(daysAgo: number): boolean {
  const d = utcWorkday(daysAgo, 12);
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

async function seedTimeLogs(
  projectCtx: { project: Project; tasks: Task[] }[],
  users: Map<string, User>
): Promise<number> {
  const assignments: {
    projectIndex: number;
    taskIndex: number;
    userEmail: string;
    weight: number;
  }[] = [
    { projectIndex: 0, taskIndex: 0, userEmail: "member@chronomint.dev", weight: 4 },
    { projectIndex: 0, taskIndex: 1, userEmail: "alex@chronomint.dev", weight: 3 },
    { projectIndex: 0, taskIndex: 2, userEmail: "jordan@chronomint.dev", weight: 2 },
    { projectIndex: 0, taskIndex: 3, userEmail: "admin@chronomint.dev", weight: 2 },
    { projectIndex: 1, taskIndex: 0, userEmail: "jordan@chronomint.dev", weight: 3 },
    { projectIndex: 1, taskIndex: 1, userEmail: "member@chronomint.dev", weight: 3 },
    { projectIndex: 1, taskIndex: 2, userEmail: "admin@chronomint.dev", weight: 2 },
    { projectIndex: 2, taskIndex: 0, userEmail: "alex@chronomint.dev", weight: 2 },
    { projectIndex: 2, taskIndex: 1, userEmail: "admin@chronomint.dev", weight: 3 },
    { projectIndex: 2, taskIndex: 2, userEmail: "member@chronomint.dev", weight: 2 },
    { projectIndex: 3, taskIndex: 0, userEmail: "alex@chronomint.dev", weight: 3 },
    { projectIndex: 3, taskIndex: 1, userEmail: "member@chronomint.dev", weight: 2 },
    { projectIndex: 3, taskIndex: 2, userEmail: "admin@chronomint.dev", weight: 2 },
    { projectIndex: 4, taskIndex: 0, userEmail: "jordan@chronomint.dev", weight: 2 },
    { projectIndex: 4, taskIndex: 1, userEmail: "member@chronomint.dev", weight: 2 },
    { projectIndex: 5, taskIndex: 0, userEmail: "alex@chronomint.dev", weight: 2 },
    { projectIndex: 5, taskIndex: 1, userEmail: "admin@chronomint.dev", weight: 2 }
  ];

  const totalDays = HISTORY_WEEKS * 7;
  let created = 0;

  for (let daysAgo = totalDays; daysAgo >= 0; daysAgo--) {
    const recent = daysAgo <= 21;
    if (!recent && !isWeekday(daysAgo)) continue;
    if (recent && daysAgo <= 7 && !isWeekday(daysAgo) && hash01(daysAgo, 0, 9) > 0.35) continue;

    const entriesToday = recent
      ? 4 + Math.floor(hash01(daysAgo, 0, 1) * 5)
      : 1 + Math.floor(hash01(daysAgo, 0, 1) * 3);

    for (let e = 0; e < entriesToday; e++) {
      const pick = pickWeighted(
        assignments,
        hash01(daysAgo, e, 2)
      );
      const ctx = projectCtx[pick.projectIndex];
      const task = ctx.tasks[pick.taskIndex];
      const user = users.get(pick.userEmail);
      if (!user) continue;

      const billableDefault = task.billableDefault;
      const isBillable = billableDefault
        ? hash01(daysAgo, e, 3) > 0.12
        : hash01(daysAgo, e, 3) > 0.85;

      const hours = roundQuarter(1 + hash01(daysAgo, e, 4) * 6.5);
      const startHour = 8 + Math.floor(hash01(daysAgo, e, 5) * 8);
      const start = utcWorkday(daysAgo, startHour, e * 15);
      const end = new Date(start.getTime() + hours * 3600 * 1000);
      const source = hash01(daysAgo, e, 6) > 0.35 ? "timer" : "manual";
      const description =
        DESCRIPTIONS[Math.floor(hash01(daysAgo, e, 7) * DESCRIPTIONS.length)]!;

      await prisma.timeLog.create({
        data: {
          userId: user.id,
          taskId: task.id,
          startTime: start,
          endTime: end,
          durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
          description: `${description} — ${ctx.project.name}`,
          isBillable,
          source
        }
      });
      created++;
    }
  }

  return created;
}

function pickWeighted<T extends { weight: number }>(items: T[], r: number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let acc = 0;
  const target = r * total;
  for (const item of items) {
    acc += item.weight;
    if (target <= acc) return item;
  }
  return items[items.length - 1]!;
}

function roundQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

/** Dense, colorful week for the demo admin account (timesheet + My week). */
async function seedAdminCurrentWeek(
  projectCtx: { project: Project; tasks: Task[] }[],
  admin: User
): Promise<number> {
  const plan: {
    daysAgo: number;
    projectIndex: number;
    taskIndex: number;
    hour: number;
    hours: number;
    billable: boolean;
  }[] = [
    { daysAgo: 0, projectIndex: 0, taskIndex: 0, hour: 9, hours: 2, billable: true },
    { daysAgo: 0, projectIndex: 2, taskIndex: 0, hour: 14, hours: 1.5, billable: false },
    { daysAgo: 1, projectIndex: 1, taskIndex: 0, hour: 10, hours: 3, billable: true },
    { daysAgo: 1, projectIndex: 3, taskIndex: 1, hour: 15, hours: 2, billable: true },
    { daysAgo: 2, projectIndex: 0, taskIndex: 1, hour: 9, hours: 2.5, billable: true },
    { daysAgo: 2, projectIndex: 4, taskIndex: 0, hour: 13, hours: 1, billable: true },
    { daysAgo: 3, projectIndex: 5, taskIndex: 0, hour: 11, hours: 2, billable: true },
    { daysAgo: 3, projectIndex: 2, taskIndex: 1, hour: 16, hours: 1, billable: false },
    { daysAgo: 4, projectIndex: 3, taskIndex: 0, hour: 10, hours: 2.5, billable: true },
    { daysAgo: 4, projectIndex: 1, taskIndex: 2, hour: 14, hours: 1.5, billable: true },
    { daysAgo: 5, projectIndex: 0, taskIndex: 2, hour: 9, hours: 2, billable: true },
    { daysAgo: 6, projectIndex: 4, taskIndex: 1, hour: 11, hours: 1.5, billable: true }
  ];

  let created = 0;
  for (const row of plan) {
    const ctx = projectCtx[row.projectIndex];
    if (!ctx) continue;
    const task = ctx.tasks[row.taskIndex];
    if (!task) continue;
    const start = utcWorkday(row.daysAgo, row.hour);
    const end = new Date(start.getTime() + row.hours * 3600 * 1000);
    await prisma.timeLog.create({
      data: {
        userId: admin.id,
        taskId: task.id,
        startTime: start,
        endTime: end,
        durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
        description: `${DESCRIPTIONS[created % DESCRIPTIONS.length]} — ${ctx.project.name}`,
        isBillable: row.billable,
        source: row.daysAgo === 0 ? "timer" : "manual"
      }
    });
    created++;
  }
  return created;
}

async function seedAcmeAgencySample(
  workspace: Workspace,
  member: User,
  admin: User
): Promise<number> {
  let project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: "Retainer Q2" }
  });
  if (project) {
    project = await prisma.project.update({
      where: { id: project.id },
      data: { color: "#14b8a6", clientName: "Northwind", budgetHours: 40, isActive: true }
    });
  } else {
    project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Retainer Q2",
        color: "#14b8a6",
        clientName: "Northwind",
        budgetHours: 40,
        isActive: true
      }
    });
  }

  const team =
    (await prisma.team.findUnique({ where: { projectId: project.id } })) ??
    (await prisma.team.create({ data: { projectId: project.id } }));

  for (const user of [member, admin]) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
      update: { isActive: true },
      create: { teamId: team.id, userId: user.id, isActive: true }
    });
  }

  let task = await prisma.task.findFirst({
    where: { projectId: project.id, taskName: "Monthly reporting" }
  });
  if (!task) {
    task = await prisma.task.create({
      data: { projectId: project.id, taskName: "Monthly reporting", billableDefault: true }
    });
  }

  await prisma.timeLog.deleteMany({
    where: { task: { project: { workspaceId: workspace.id } } }
  });

  let created = 0;
  for (const daysAgo of [3, 10, 24]) {
    const start = utcWorkday(daysAgo, 10);
    const hours = daysAgo === 10 ? 3 : 2;
    const end = new Date(start.getTime() + hours * 3600 * 1000);
    await prisma.timeLog.create({
      data: {
        userId: member.id,
        taskId: task.id,
        startTime: start,
        endTime: end,
        durationSec: hours * 3600,
        description: "Retainer deliverables",
        isBillable: true,
        source: "manual"
      }
    });
    created++;
  }

  return created;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
