/**
 * Wipe ALL timelogs and reseed rich weekday data for demo members.
 *
 * Usage:
 *   corepack pnpm --filter @kloqra/api prisma:seed:member-rich
 */
import { PrismaClient } from "./generated/client";
import {
  calendarDayKey,
  DEFAULT_MEMBER_EMAILS,
  DEFAULT_RANGE,
  findOverlapsInBatch,
  listWeekdaysInRange,
  planDayEntries,
  type CalendarDay
} from "./seed-member-rich-timelogs.util";

const prisma = new PrismaClient();

const ACME_SLUG = "acme";
const DEFAULT_TIMEZONE = "America/New_York";

const LOG_DESCRIPTIONS = [
  "Feature implementation",
  "Code review and fixes",
  "Sprint standup and planning",
  "Documentation update",
  "Bug triage and resolution",
  "Integration testing",
  "Client sync",
  "Refactor and cleanup"
] as const;

type TaskRow = {
  id: string;
  taskName: string;
  projectId: string;
  projectName: string;
};

async function resolveUserTimeZone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });
  const prefTz = (user?.preferences as { timezone?: string } | null)?.timezone?.trim();
  if (prefTz) return prefTz;

  const acme = await prisma.workspaceMember.findFirst({
    where: { userId, workspace: { slug: ACME_SLUG } },
    select: { workspace: { select: { settings: true } } }
  });
  const wsTz = (acme?.workspace.settings as { timezone?: string } | null)?.timezone?.trim();
  return wsTz || DEFAULT_TIMEZONE;
}

async function resolveMemberTasks(userId: string): Promise<TaskRow[]> {
  const memberships = await prisma.teamMember.findMany({
    where: {
      userId,
      isActive: true,
      team: {
        project: {
          workspace: { slug: ACME_SLUG },
          isActive: true,
          timesheetApprovalEnabled: true
        }
      }
    },
    select: {
      team: {
        select: {
          project: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });

  const projectIds = [...new Set(memberships.map((m) => m.team.project.id))];
  if (projectIds.length === 0) return [];

  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      isActive: true,
      OR: [{ isCommon: true }, { assignees: { some: { userId } } }]
    },
    select: {
      id: true,
      taskName: true,
      projectId: true,
      project: { select: { name: true } }
    },
    orderBy: { taskName: "asc" }
  });

  return tasks.map((t) => ({
    id: t.id,
    taskName: t.taskName,
    projectId: t.projectId,
    projectName: t.project.name
  }));
}

async function clearAllTimelogData(): Promise<void> {
  const amendments = await prisma.timesheetAmendmentRequest.deleteMany();
  const periods = await prisma.timesheetPeriod.deleteMany();
  const logs = await prisma.timeLog.deleteMany();

  console.log(
    `  Wiped ALL timelogs (${logs.count}), timesheet periods (${periods.count}), amendments (${amendments.count}).`
  );
}

/** Seeded July hours only appear on Submissions if approval started before those periods. */
async function backdateApprovalPolicyForProjects(projectIds: string[]): Promise<void> {
  if (projectIds.length === 0) return;
  const policyStart = new Date("2026-06-30T00:00:00.000Z");
  await prisma.project.updateMany({
    where: { id: { in: projectIds } },
    data: {
      timesheetApprovalEnabled: true,
      timesheetApprovalPeriod: "weekly",
      timesheetApprovalEnabledAt: policyStart,
      timesheetApprovalPeriodEffectiveAt: policyStart
    }
  });
  console.log(`  Backdated timesheet approval to 2026-06-30 for ${projectIds.length} project(s).`);
}

function pickTask(tasks: TaskRow[], day: CalendarDay, slotIndex: number): TaskRow {
  if (tasks.length === 0) {
    throw new Error("No assignable tasks on approval-enabled Acme projects");
  }
  const key = calendarDayKey(day)
    .split("-")
    .reduce((n, part) => n + Number(part), 0);
  return tasks[(key + slotIndex) % tasks.length]!;
}

function descriptionFor(slotIndex: number, taskName: string, projectName: string): string {
  const base = LOG_DESCRIPTIONS[slotIndex % LOG_DESCRIPTIONS.length]!;
  return `${base} — ${taskName} (${projectName})`;
}

async function seedUserLogs(
  userId: string,
  email: string,
  range: { start: CalendarDay; end: CalendarDay }
): Promise<number> {
  const tasks = await resolveMemberTasks(userId);
  if (tasks.length === 0) {
    console.warn(`  ${email}: no Acme approval tasks — add to project team first.`);
    return 0;
  }
  await backdateApprovalPolicyForProjects([...new Set(tasks.map((t) => t.projectId))]);

  const timeZone = await resolveUserTimeZone(userId);
  const weekdays = listWeekdaysInRange(range.start, range.end, timeZone);
  const batch: {
    userId: string;
    taskId: string;
    startTime: Date;
    endTime: Date;
    durationSec: number;
    description: string;
    isBillable: boolean;
    source: string;
  }[] = [];

  for (const day of weekdays) {
    const slots = planDayEntries(day, timeZone);
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex]!;
      const task = pickTask(tasks, day, slotIndex);
      batch.push({
        userId,
        taskId: task.id,
        startTime: slot.start,
        endTime: slot.end,
        durationSec: slot.durationSec,
        description: descriptionFor(slotIndex, task.taskName, task.projectName),
        isBillable: true,
        source: slotIndex === 0 ? "timer" : "manual"
      });
    }
  }

  const overlaps = findOverlapsInBatch(batch);
  if (overlaps.length > 0) {
    throw new Error(`Overlap detected for ${email}:\n${overlaps.slice(0, 5).join("\n")}`);
  }

  const CHUNK = 500;
  for (let i = 0; i < batch.length; i += CHUNK) {
    await prisma.timeLog.createMany({ data: batch.slice(i, i + CHUNK) });
  }

  const totalHours = batch.reduce((s, r) => s + r.durationSec, 0) / 3600;
  console.log(
    `  ${email}: ${batch.length} entries, ${weekdays.length} weekdays, ${totalHours.toFixed(1)}h (${timeZone}).`
  );
  return batch.length;
}

async function verifyNoDbOverlaps(userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    const logs = await prisma.timeLog.findMany({
      where: { userId },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: "asc" }
    });
    const overlaps = findOverlapsInBatch(logs.map((l) => ({ userId, ...l })));
    if (overlaps.length > 0) {
      throw new Error(`Post-insert overlap for ${userId}: ${overlaps[0]}`);
    }
  }
}

async function main() {
  const emails = (process.env.SEED_MEMBER_EMAILS ?? DEFAULT_MEMBER_EMAILS.join(","))
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const range = DEFAULT_RANGE;
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  KLOQRA — FULL timelog wipe + rich member reseed (Acme only)");
  console.log(`  Range: ${calendarDayKey(range.start)} → ${calendarDayKey(range.end)} (weekdays)`);
  console.log(`  Members: ${emails.join(", ")}`);
  console.log("══════════════════════════════════════════════════════════\n");

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true }
  });

  const missing = emails.filter((e) => !users.some((u) => u.email === e));
  if (missing.length > 0) {
    throw new Error(`Users not found: ${missing.join(", ")} — run pnpm prisma:seed first.`);
  }

  await clearAllTimelogData();

  let total = 0;
  for (const user of users) {
    total += await seedUserLogs(user.id, user.email, range);
  }

  await verifyNoDbOverlaps(users.map((u) => u.id));

  const remaining = await prisma.timeLog.count();
  console.log(
    `\nDone — ${total} timelog rows created (${remaining} total in DB). Verified: zero overlaps.\n`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
