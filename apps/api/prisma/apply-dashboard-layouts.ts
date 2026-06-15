import { Prisma, PrismaClient } from "@prisma/client";
import {
  buildPreferencesWithDashboardLayouts,
  SEED_ADMIN_DASHBOARD_LAYOUT,
  SEED_CLIENT_DASHBOARD_LAYOUT
} from "./seed-dashboard-layouts";

const prisma = new PrismaClient();

async function main() {
  const memberships = await prisma.workspaceMember.findMany({
    include: { user: true, workspace: true },
    orderBy: [{ workspaceId: "asc" }, { userId: "asc" }]
  });

  const pending = new Map<
    string,
    { email: string; preferences: Prisma.InputJsonValue; assignments: number }
  >();

  for (const membership of memberships) {
    const { user, workspace, role } = membership;
    if (role !== "ADMIN" && role !== "MEMBER") continue;

    const app = role === "ADMIN" ? "admin" : "client";
    const layout = role === "ADMIN" ? SEED_ADMIN_DASHBOARD_LAYOUT : SEED_CLIENT_DASHBOARD_LAYOUT;
    const existing = pending.get(user.id)?.preferences ?? user.preferences;
    const merged = buildPreferencesWithDashboardLayouts(
      existing,
      workspace.id,
      app,
      layout,
      layout
    );

    pending.set(user.id, {
      email: user.email,
      preferences: merged as Prisma.InputJsonValue,
      assignments: (pending.get(user.id)?.assignments ?? 0) + 1
    });
  }

  for (const [userId, update] of pending) {
    await prisma.user.update({
      where: { id: userId },
      data: { preferences: update.preferences }
    });
    console.log(`  ${update.email}: ${update.assignments} workspace layout(s)`);
  }

  const assignmentCount = [...pending.values()].reduce((sum, item) => sum + item.assignments, 0);
  console.log(
    `Applied dashboard defaults to ${pending.size} user(s) across ${assignmentCount} workspace assignment(s).`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
