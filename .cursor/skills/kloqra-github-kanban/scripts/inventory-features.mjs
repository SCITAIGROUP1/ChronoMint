#!/usr/bin/env node
/**
 * Code-first feature inventory scanner for Kloqra MVP.
 * Usage: node .cursor/skills/kloqra-github-kanban/scripts/inventory-features.mjs
 */
import { readdir, stat, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

const DOMAINS = [
  {
    id: "F-01",
    name: "Auth & session",
    api: "auth",
    client: "app/(auth)",
    admin: "login",
    spec: "auth-workspace.md",
    mvp: true
  },
  {
    id: "F-02",
    name: "Users & profile",
    api: "users",
    client: "profile,settings",
    admin: "profile,settings",
    spec: "user-profile.md",
    mvp: true
  },
  {
    id: "F-03",
    name: "Workspace & RBAC",
    api: "workspace",
    client: "workspace-shell",
    admin: "workspace",
    spec: "auth-workspace.md",
    mvp: true
  },
  {
    id: "F-04",
    name: "Projects & invites",
    api: "projects",
    client: "features/projects",
    admin: "features/projects",
    spec: "projects.md",
    mvp: true
  },
  {
    id: "F-05",
    name: "Categories & tasks",
    api: "categories,tasks",
    client: "features/projects",
    admin: "categories",
    spec: "projects.md",
    mvp: true
  },
  {
    id: "F-06",
    name: "Timer",
    api: "timer",
    client: "features/timer",
    admin: null,
    spec: "timer.md",
    mvp: true
  },
  {
    id: "F-07",
    name: "Timelogs & tracker",
    api: "timelogs",
    client: "features/time-tracker",
    admin: null,
    spec: "timelogs.md",
    mvp: true
  },
  {
    id: "F-08",
    name: "Timesheets & approvals",
    api: "timelogs",
    client: "submissions,timesheet",
    admin: "approvals",
    spec: "timelogs.md",
    mvp: true
  },
  {
    id: "F-09",
    name: "Billing",
    api: "billing",
    client: null,
    admin: "billing",
    spec: "billing.md",
    mvp: false
  },
  {
    id: "F-10",
    name: "Reporting & dashboards",
    api: "reporting",
    client: "features/dashboard",
    admin: "features/dashboard",
    spec: "reporting.md",
    mvp: true
  },
  {
    id: "F-11",
    name: "Presence & team live",
    api: "presence",
    client: null,
    admin: "features/team",
    spec: "presence.md",
    mvp: true
  },
  {
    id: "F-12",
    name: "Export (hours only)",
    api: "export",
    client: "components/timesheet-export.tsx",
    admin: "features/exports",
    spec: "export.md",
    mvp: true
  },
  {
    id: "F-13",
    name: "Notifications",
    api: "notifications",
    client: "notifications",
    admin: "notifications",
    spec: null,
    mvp: true
  },
  {
    id: "F-14",
    name: "AI assistant",
    api: "assistant",
    client: "features/assistant",
    admin: null,
    spec: "assistant.md",
    mvp: true
  },
  {
    id: "F-15",
    name: "Onboarding",
    api: null,
    client: "features/onboarding",
    admin: null,
    spec: null,
    mvp: true
  },
  {
    id: "F-X",
    name: "Platform & quality",
    api: null,
    client: null,
    admin: null,
    spec: null,
    mvp: true
  }
];

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function countSpecs(dir, pattern = /\.spec\.(ts|tsx)$/) {
  let n = 0;
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory() && e.name !== "node_modules") await walk(p);
      else if (pattern.test(e.name)) n++;
    }
  }
  await walk(dir);
  return n;
}

async function scanDomain(d) {
  const row = { ...d, apiPath: null, apiSpecs: 0, specExists: false, gaps: [] };

  if (d.api) {
    const mods = d.api.split(",");
    for (const m of mods) {
      const p = join(ROOT, "apps/api/src/modules", m.trim());
      if (await exists(p)) {
        row.apiPath = relative(ROOT, p);
        row.apiSpecs += await countSpecs(p);
      }
    }
  }

  if (d.spec) {
    row.specExists = await exists(join(ROOT, "docs/specs", d.spec));
  }

  return row;
}

const KNOWN_GAPS = {
  "F-02": ["GET /users/me/activity in contracts — no controller"],
  "F-03": ["workspace.controller throws raw Error instead of DomainException"],
  "F-05": ["orphan features/tasks/tasks-page.tsx; /tasks redirects to /projects"],
  "F-10": ["MyWeekSummary component unwired on client dashboard"],
  "F-11": ["presence module has no unit specs"],
  "F-12": ["TimesheetExport not imported on any page; GET /export legacy dead route"],
  "F-13": ["NotificationsDispatchService untested"],
  "F-14": ["assistant depends on external ASSISTANT_SERVICE_URL"],
  "F-15": ["no docs/specs/onboarding.md"],
  "F-X": [
    "Prisma fields leak on workspace/timesheet mutations",
    "Slim list DTOs per api_surface_audit plan"
  ]
};

async function main() {
  const results = [];
  for (const d of DOMAINS) {
    const row = await scanDomain(d);
    row.gaps = KNOWN_GAPS[d.id] ?? [];
    row.health = row.gaps.length ? "Gap" : "Shipped";
    if (!d.mvp) row.health = "Out of MVP";
    results.push(row);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    mvpDomains: results.filter((r) => r.mvp),
    excluded: results.filter((r) => !r.mvp),
    all: results
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
