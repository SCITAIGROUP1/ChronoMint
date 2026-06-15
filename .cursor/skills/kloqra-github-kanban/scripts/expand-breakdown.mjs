#!/usr/bin/env node
/**
 * Post full MVP breakdown: epics, shipped stories, gap stories, tasks.
 * Links hierarchy: Epic → Story → Task via sub_issues API.
 */
import { spawnSync } from "node:child_process";

const REPO = "SCITAIGROUP1/ChronoMint";
const OWNER = "SCITAIGROUP1";
const PROJECT = 4;
const PROJECT_ID = "PVT_kwDOEUQ_7s4Baruy";
const STATUS_FIELD = "PVTSSF_lADOEUQ_7s4BaruyzhVhgrs";

const EXISTING = {
  "F-12": { epic: 198, stories: { wireExport: 199 } },
  stories: {
    prismaDto: 200,
    presenceTests: 201,
    weekSummary: 203,
    tasksCleanup: 204
  }
};

function gh(args) {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
  return (r.stdout || "").trim();
}

function createIssue(title, labels, body, lane) {
  const url = gh([
    "issue",
    "create",
    "--repo",
    REPO,
    "--title",
    title,
    "--label",
    labels.join(","),
    "--body",
    body
  ]);
  const num = Number(url.match(/(\d+)$/)?.[1]);
  const id = Number(gh(["api", `repos/${REPO}/issues/${num}`, "--jq", ".id"]));
  addToProject(url, lane);
  return { num, id, url };
}

function linkSubIssue(parentNum, childId) {
  spawnSync(
    "bash",
    [
      "-c",
      `echo '{"sub_issue_id":${childId}}' | gh api -X POST repos/${REPO}/issues/${parentNum}/sub_issues --input -`
    ],
    { encoding: "utf8" }
  );
}

// alias
const linkSub = linkSubIssue;

const STATUS_CACHE = {};

function addToProject(url, lane) {
  const addOut = gh([
    "project",
    "item-add",
    String(PROJECT),
    "--owner",
    OWNER,
    "--url",
    url,
    "--format",
    "json"
  ]);
  const itemId = JSON.parse(addOut).id;
  if (!STATUS_CACHE[lane]) {
    const q = `query { organization(login:"${OWNER}") { projectV2(number:${PROJECT}) { fields(first:30) { nodes { ... on ProjectV2SingleSelectField { name options { id name } } } } } } }`;
    const data = JSON.parse(gh(["api", "graphql", "-f", `query=${q}`]));
    const field = data.data.organization.projectV2.fields.nodes.find((n) => n?.name === "Status");
    for (const o of field.options) STATUS_CACHE[o.name] = o.id;
  }
  const opt = STATUS_CACHE[lane];
  if (!opt) return;
  gh([
    "api",
    "graphql",
    "-f",
    `query=mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){projectV2Item{id}}}`,
    "-f",
    `p=${PROJECT_ID}`,
    "-f",
    `i=${itemId}`,
    "-f",
    `f=${STATUS_FIELD}`,
    "-f",
    `o=${opt}`
  ]);
}

function taskBody(parentStory, role, summary, ac, paths, order) {
  return `## Summary
${summary}

## Parent
Story #${parentStory}

## Role
${role} — step ${order} in delivery order

## Acceptance criteria
${ac.map((a, i) => `- [ ] **AC-${i + 1}:** ${a}`).join("\n")}

## Target paths
${paths.map((p) => `- \`${p}\``).join("\n")}

## QA verification matrix
| AC | Type | Automated | Pass |
|----|------|-----------|------|
${ac.map((_, i) => `| AC-${i + 1} | ${role === "QA" ? "Unit/E2E" : "Regression"} | TBD | [ ] |`).join("\n")}

<SYNC_BLOCK status="TODO" lane="backlog" />`;
}

function epicBody(id, name, evidence, gaps) {
  return `## Epic: ${id} — ${name}

## Shipped evidence
${evidence}

## Open gaps
${gaps.map((g) => `- ${g}`).join("\n")}

## MVP exclusions
Budget, revenue, billing, client portal — do not file.`;
}

function shippedStoryBody(id, name, paths) {
  return `## Summary
Shipped baseline for ${id} — ${name}. Reference only.

## Status
**done** — implemented in repo.

## Evidence
${paths.map((p) => `- \`${p}\``).join("\n")}

## Acceptance criteria
- [ ] **AC-1:** Given codebase at main, when paths above are inspected, then feature is wired and tests exist where noted.`;
}

function getId(num) {
  return Number(gh(["api", `repos/${REPO}/issues/${num}`, "--jq", ".id"]));
}

function gapStory(fid, summary, paths) {
  return `## Summary\n${summary}\n\n## Feature\n${fid}\n\n## Acceptance criteria\n- [ ] **AC-1:** Given implementation complete, when tests run, then gap is closed.\n\n## Paths\n${paths.map((p) => `- \`${p}\``).join("\n")}`;
}

const EPICS = [
  {
    id: "F-01",
    name: "Auth & session",
    lane: "done",
    evidence: "apps/api/src/modules/auth, apps/client/(auth), apps/admin/login",
    gaps: []
  },
  {
    id: "F-02",
    name: "Users & profile",
    lane: "backlog",
    evidence: "modules/users, web-shared profile",
    gaps: ["/users/me/activity missing"]
  },
  {
    id: "F-03",
    name: "Workspace & RBAC",
    lane: "backlog",
    evidence: "modules/workspace, admin workspace page",
    gaps: ["DomainException in controller"]
  },
  {
    id: "F-04",
    name: "Projects & invites",
    lane: "done",
    evidence: "modules/projects, client/admin projects",
    gaps: []
  },
  {
    id: "F-05",
    name: "Categories & tasks",
    lane: "backlog",
    evidence: "categories, tasks modules",
    gaps: ["orphan /tasks route"]
  },
  { id: "F-06", name: "Timer", lane: "done", evidence: "modules/timer, features/timer", gaps: [] },
  {
    id: "F-07",
    name: "Timelogs & tracker",
    lane: "done",
    evidence: "modules/timelogs, time-tracker",
    gaps: []
  },
  {
    id: "F-08",
    name: "Timesheets & approvals",
    lane: "done",
    evidence: "submissions, approvals, timesheets API",
    gaps: []
  },
  {
    id: "F-10",
    name: "Reporting & dashboards",
    lane: "backlog",
    evidence: "reporting module, dashboards",
    gaps: ["MyWeekSummary unwired"]
  },
  {
    id: "F-11",
    name: "Presence & team live",
    lane: "backlog",
    evidence: "modules/presence, team-page",
    gaps: ["no unit tests"]
  },
  {
    id: "F-13",
    name: "Notifications",
    lane: "backlog",
    evidence: "modules/notifications",
    gaps: ["dispatch service untested"]
  },
  {
    id: "F-14",
    name: "AI assistant",
    lane: "backlog",
    evidence: "modules/assistant, features/assistant",
    gaps: ["external proxy dependency"]
  },
  {
    id: "F-15",
    name: "Onboarding",
    lane: "done",
    evidence: "features/onboarding",
    gaps: ["no spec doc"]
  },
  {
    id: "F-X",
    name: "Platform & quality",
    lane: "backlog",
    evidence: "contracts, CI, api audit",
    gaps: ["DTO leaks", "slim list DTOs"]
  }
];

const SHIPPED = {
  "F-01": ["apps/api/src/modules/auth", "apps/client/src/app/(auth)"],
  "F-04": ["apps/api/src/modules/projects", "apps/client/src/features/projects"],
  "F-06": ["apps/api/src/modules/timer", "apps/client/src/features/timer"],
  "F-07": ["apps/api/src/modules/timelogs", "apps/client/src/features/time-tracker"],
  "F-08": ["apps/client/src/features/submissions", "apps/admin/src/features/approvals"],
  "F-15": ["apps/client/src/features/onboarding"]
};

function main() {
  const epicNums = { "F-12": EXISTING["F-12"].epic };

  console.log("=== Creating feature epics ===");
  for (const e of EPICS) {
    if (epicNums[e.id]) continue;
    const labels = [
      "type:epic",
      e.gaps.length ? "health:gap" : "health:shipped",
      e.lane === "done" ? "priority:P3" : "priority:P2"
    ];
    const created = createIssue(
      `[Epic][${e.id}] ${e.name}`,
      labels,
      epicBody(e.id, e.name, e.evidence, e.gaps),
      e.lane
    );
    epicNums[e.id] = created.num;
    console.log(`Epic ${e.id} → #${created.num} (${e.lane})`);
  }

  console.log("\n=== Shipped baseline stories (done) ===");
  for (const [fid, paths] of Object.entries(SHIPPED)) {
    const epic = epicNums[fid];
    const name = EPICS.find((x) => x.id === fid)?.name ?? fid;
    const created = createIssue(
      `[Story][${fid}] Shipped baseline — ${name}`,
      ["type:story", "health:shipped", "priority:P3"],
      shippedStoryBody(fid, name, paths),
      "done"
    );
    linkSub(epic, created.id);
    console.log(`  #${created.num} under epic #${epic}`);
  }

  console.log("\n=== Linking existing stories to epics ===");
  linkSub(epicNums["F-12"], getId(EXISTING["F-12"].stories.wireExport));
  linkSub(epicNums["F-X"], getId(EXISTING.stories.prismaDto));
  linkSub(epicNums["F-11"], getId(EXISTING.stories.presenceTests));
  linkSub(epicNums["F-10"], getId(EXISTING.stories.weekSummary));
  linkSub(epicNums["F-05"], getId(EXISTING.stories.tasksCleanup));

  console.log("\n=== New gap stories ===");
  const gapStories = [
    {
      epic: "F-02",
      title: "Implement or remove GET /users/me/activity",
      lane: "backlog",
      body: gapStory("F-02", "Either wire activity endpoint or remove from contracts", [
        "packages/contracts",
        "apps/api/src/modules/users"
      ])
    },
    {
      epic: "F-12",
      title: "Deprecate legacy GET /export route",
      lane: "backlog",
      body: gapStory("F-12", "Remove or 410 unused GET /export", ["apps/api/src/modules/export"])
    },
    {
      epic: "F-13",
      title: "Add NotificationsDispatchService unit tests",
      lane: "backlog",
      body: gapStory("F-13", "Cover dispatch paths for timesheet/timer notifications", [
        "apps/api/src/modules/notifications"
      ])
    },
    {
      epic: "F-15",
      title: "Add docs/specs/onboarding.md",
      lane: "backlog",
      body: gapStory("F-15", "Document onboarding tour steps and storage", [
        "docs/specs/onboarding.md",
        "apps/client/src/features/onboarding"
      ])
    },
    {
      epic: "F-X",
      title: "Introduce slim list DTOs per API audit",
      lane: "backlog",
      body: gapStory("F-X", "ProjectListItem, TaskListItem, CategoryListItem", [
        "packages/contracts",
        "apps/api"
      ])
    }
  ];

  const storyNums = { ...EXISTING.stories, wireExport: EXISTING["F-12"].stories.wireExport };

  for (const g of gapStories) {
    const created = createIssue(
      `[Story][${g.epic}] ${g.title}`,
      ["type:story", "health:gap", "priority:P2"],
      g.body,
      g.lane
    );
    linkSub(epicNums[g.epic], created.id);
    console.log(`  #${created.num} → epic ${g.epic}`);
  }

  console.log("\n=== Tasks under active stories ===");
  const tasks = [
    {
      parent: 199,
      title: "[Task][F-12][QA] Playwright tests for timesheet CSV export",
      role: "QA",
      lane: "ready",
      body: taskBody(
        199,
        "QA",
        "Failing e2e for export AC-1..3",
        [
          "Given member with logs, export downloads CSV",
          "Given empty week, toast shown",
          "Given logged out, redirect login"
        ],
        ["apps/client/e2e/timesheet.spec.ts"],
        1
      )
    },
    {
      parent: 199,
      title: "[Task][F-12][FE] Mount TimesheetExport on timesheet page",
      role: "FE",
      lane: "backlog",
      body: taskBody(
        199,
        "FE",
        "Wire existing export component",
        ["Export button visible on /timesheet", "Calls POST /export/me", "Handles empty state"],
        [
          "apps/client/src/features/timesheet/timesheet-page.tsx",
          "apps/client/src/components/timesheet-export.tsx"
        ],
        2
      )
    },
    {
      parent: 200,
      title: "[Task][F-X][QA] E2E tests for mutation response DTO shape",
      role: "QA",
      lane: "ready",
      body: taskBody(
        200,
        "QA",
        "Assert no Prisma field leaks",
        ["Workspace PATCH whitelist", "Timesheet approve/reject shape"],
        ["apps/api/test"],
        1
      )
    },
    {
      parent: 200,
      title: "[Task][F-X][BE] Map workspace PATCH to WorkspaceDto",
      role: "BE",
      lane: "backlog",
      body: taskBody(
        200,
        "BE",
        "Explicit mapper on workspace update",
        ["Response matches contract only"],
        ["apps/api/src/modules/workspace"],
        2
      )
    },
    {
      parent: 200,
      title: "[Task][F-X][BE] Map timesheet approve/reject responses",
      role: "BE",
      lane: "backlog",
      body: taskBody(
        200,
        "BE",
        "Stop returning raw Prisma rows",
        ["Returns ok or period DTO"],
        ["apps/api/src/modules/timelogs"],
        3
      )
    },
    {
      parent: 200,
      title: "[Task][F-X][BE] Use DomainException for workspace forbidden",
      role: "BE",
      lane: "backlog",
      body: taskBody(
        200,
        "BE",
        "Replace throw new Error",
        ["403 uses DomainException format"],
        ["apps/api/src/modules/workspace/interface"],
        4
      )
    },
    {
      parent: 201,
      title: "[Task][F-11][QA] presence.service.spec.ts happy path",
      role: "QA",
      lane: "ready",
      body: taskBody(
        201,
        "QA",
        "Snapshot with mocked Redis",
        ["DTO matches schema"],
        ["apps/api/src/modules/presence/application/presence.service.spec.ts"],
        1
      )
    },
    {
      parent: 201,
      title: "[Task][F-11][QA] presence.service empty and forbidden cases",
      role: "QA",
      lane: "backlog",
      body: taskBody(
        201,
        "QA",
        "Edge case coverage",
        ["Empty timers", "Forbidden workspace"],
        ["apps/api/src/modules/presence"],
        2
      )
    },
    {
      parent: 203,
      title: "[Task][F-10][QA] Dashboard e2e for MyWeekSummary",
      role: "QA",
      lane: "backlog",
      body: taskBody(
        203,
        "QA",
        "E2e week summary widget",
        ["Shows hours for current week"],
        ["apps/client/e2e/dashboard.spec.ts"],
        1
      )
    },
    {
      parent: 203,
      title: "[Task][F-10][FE] Wire MyWeekSummary on dashboard",
      role: "FE",
      lane: "backlog",
      body: taskBody(
        203,
        "FE",
        "Mount component via member-data store",
        ["Widget visible on /dashboard"],
        ["apps/client/src/features/dashboard/dashboard-page.tsx"],
        2
      )
    },
    {
      parent: 204,
      title: "[Task][F-05][QA] E2E test /tasks redirect",
      role: "QA",
      lane: "backlog",
      body: taskBody(
        204,
        "QA",
        "Navigation regression",
        ["/tasks resolves to /projects"],
        ["apps/client/e2e"],
        1
      )
    },
    {
      parent: 204,
      title: "[Task][F-05][FE] Remove orphan TasksPage",
      role: "FE",
      lane: "backlog",
      body: taskBody(
        204,
        "FE",
        "Delete or repurpose dead code",
        ["No orphan tasks-page.tsx"],
        ["apps/client/src/features/tasks"],
        2
      )
    }
  ];

  for (const t of tasks) {
    const labels = ["type:task", `role:${t.role}`, "priority:P1"];
    const created = createIssue(t.title, labels, t.body, t.lane);
    linkSub(t.parent, created.id);
    console.log(`  #${created.num} → story #${t.parent} (${t.lane})`);
  }

  console.log("\nDone. Refresh Project #4 board view.");
}

main();
