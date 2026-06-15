#!/usr/bin/env node
/**
 * Post stories + role tasks from plans-inventory.json to GitHub.
 * Skips items already in plans-posted.json. Use --all after inventory-plans --all.
 */
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const INVENTORY =
  process.env.PLANS_INVENTORY ?? join(ROOT, "docs/agent/backlog/plans-inventory.json");
const MANIFEST = join(ROOT, "docs/agent/backlog/plans-posted.json");
const REPO = "SCITAIGROUP1/ChronoMint";
const OWNER = "SCITAIGROUP1";
const PROJECT = 4;
const PROJECT_ID = "PVT_kwDOEUQ_7s4Baruy";
const STATUS_FIELD = "PVTSSF_lADOEUQ_7s4BaruyzhVhgrs";

const EPIC_NUM = {
  "F-01": 206,
  "F-02": 207,
  "F-03": 208,
  "F-04": 209,
  "F-05": 210,
  "F-06": 211,
  "F-07": 212,
  "F-08": 213,
  "F-10": 214,
  "F-11": 215,
  "F-12": 198,
  "F-13": 216,
  "F-14": 217,
  "F-15": 218,
  "F-X": 219
};

function gh(args) {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return (r.stdout || "").trim();
}

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

function linkSub(parentNum, childId) {
  spawnSync(
    "bash",
    [
      "-c",
      `echo '{"sub_issue_id":${childId}}' | gh api -X POST repos/${REPO}/issues/${parentNum}/sub_issues --input -`
    ],
    {
      encoding: "utf8"
    }
  );
}

function storyBody(item) {
  if (item.action === "rollup_done" && item.rollupTodos) {
    const list = item.rollupTodos.map((t) => `- [x] \`${t.id}\` — ${t.content}`).join("\n");
    return `## Summary
Plan **${item.planName}** is fully shipped in codebase. Rollup anchor for traceability.

## Source plan
\`${item.planFile}\`

## Completed todos
${list}

## QA verification matrix
| AC | Type | Pass |
|----|------|------|
| AC-1 | Code audit | [x] Plan todos marked completed in frontmatter |

<SYNC_BLOCK status="DONE" lane="done" />`;
  }

  const shipped = item.action === "post_done";
  return `## Summary
${item.content}

## Source plan
- File: \`${item.planFile}\`
- Plan: **${item.planName}**
- Todo id: \`${item.todoId}\`
${shipped ? "\n> **Shipped** — posted to done for board traceability.\n" : ""}

## Feature
| Domain | ${item.epic} |
| MVP | ${item.action === "on_hold_post_mvp" ? "Out of scope (on-hold)" : "In scope"} |

## BA — Acceptance criteria
- [ ] **AC-1:** Given plan todo \`${item.todoId}\` is implemented, when verification steps in the plan pass, then this story can move to **done**.
- [ ] **AC-2:** Given regression suite runs, when \`pnpm test\` executes, then no related tests fail.

## QA verification matrix
| AC | Type | Automated | Manual steps | Pass |
|----|------|-----------|--------------|------|
| AC-1 | Plan | See \`${item.planFile}\` | Follow plan verification | [${shipped ? "x" : " "}] |
| AC-2 | Regression | \`pnpm test\` | CI green | [${shipped ? "x" : " "}] |

## Out of scope
Budget, revenue, billing (MVP exclusion per board policy).`;
}

function taskBody(parentNum, role, summary, paths) {
  return `## Summary
${summary}

## Parent story
#${parentNum}

## Role
${role}

## Target paths
${paths.map((p) => `- \`${p}\``).join("\n")}

## Acceptance criteria
- [ ] **AC-1:** Implementation complete per parent story plan todo.

<SYNC_BLOCK status="TODO" lane="backlog" />`;
}

function inferTasks(item) {
  if (item.action === "post_done" || item.action === "rollup_done") return [];

  const c = item.content.toLowerCase();
  const tasks = [];
  const paths = [];
  if (c.includes("contract") || c.includes("dto") || c.includes("routes"))
    paths.push("packages/contracts");
  if (c.includes("api") || c.includes("prisma") || c.includes("module")) paths.push("apps/api");
  if (c.includes("client") || c.includes("member")) paths.push("apps/client");
  if (c.includes("admin")) paths.push("apps/admin");
  if (c.includes("e2e") || c.includes("playwright") || c.includes("test") || c.includes("spec"))
    tasks.push({
      role: "QA",
      title: "Add/update automated tests",
      paths: paths.length ? paths : ["**/*.spec.ts"]
    });
  if (c.includes("ui") || c.includes("page") || c.includes("widget") || c.includes("client"))
    tasks.push({
      role: "FE",
      title: "Implement UI changes",
      paths: paths.filter((p) => p.includes("client") || p.includes("admin") || p.includes("ui"))
    });
  if (
    c.includes("api") ||
    c.includes("service") ||
    c.includes("prisma") ||
    c.includes("mapper") ||
    c.includes("dispatch") ||
    c.includes("smtp") ||
    c.includes("mailer")
  )
    tasks.push({
      role: "BE",
      title: "Implement API/service changes",
      paths: paths.filter((p) => p.includes("api") || p.includes("contracts"))
    });
  if (c.includes("contract") && !tasks.find((t) => t.role === "BE"))
    tasks.push({ role: "LSA", title: "Update contracts SSOT", paths: ["packages/contracts"] });
  if (c.includes("github") || c.includes("ci") || c.includes("docs/qa"))
    tasks.push({ role: "QA", title: "Process/docs/CI wiring", paths: ["docs/qa", ".github"] });
  if (tasks.length === 0)
    tasks.push({
      role: "BE",
      title: "Implement per plan",
      paths: paths.length ? paths : ["see plan file"]
    });
  return tasks;
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

async function loadPosted() {
  try {
    const data = JSON.parse(await readFile(MANIFEST, "utf8"));
    return {
      created: data.created ?? [],
      keys: new Set((data.created ?? []).map((c) => `${c.plan}/${c.todo}`))
    };
  } catch {
    return { created: [], keys: new Set() };
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { items } = JSON.parse(await readFile(INVENTORY, "utf8"));
  const { created: prior, keys: postedKeys } = await loadPosted();

  const ACTIONS = new Set(["post", "post_done", "on_hold_post_mvp", "rollup_done"]);
  const toPost = items.filter(
    (i) => ACTIONS.has(i.action) && !postedKeys.has(`${i.planSlug}/${i.todoId}`)
  );

  if (dryRun) {
    console.log(
      `Would post ${toPost.length} plan stories (${toPost.filter((i) => i.action === "rollup_done").length} rollups)`
    );
    for (const i of toPost)
      console.log(
        `  [${i.epic}][${i.action}] ${i.planSlug}/${i.todoId}: ${i.content.slice(0, 55)}… → ${i.lane ?? "backlog"}`
      );
    return;
  }

  const created = [];
  for (const item of toPost) {
    const lane = item.lane ?? (item.action === "on_hold_post_mvp" ? "on-hold" : "backlog");
    const isDone = item.action === "post_done" || item.action === "rollup_done";
    const labels = [
      "type:story",
      isDone ? "health:shipped" : "health:gap",
      item.action === "on_hold_post_mvp"
        ? "mvp:out-of-scope"
        : isDone
          ? "priority:P3"
          : "priority:P2"
    ];
    const short =
      item.action === "rollup_done"
        ? `[Rollup] ${item.planName ?? item.planSlug}`
        : item.content.length > 55
          ? `${item.content.slice(0, 52)}…`
          : item.content;
    const title = `[Story][${item.epic}][Plan] ${short}`;
    const story = createIssue(title, labels, storyBody(item), lane);
    const epic = EPIC_NUM[item.epic];
    if (epic) linkSub(epic, story.id);

    const tasks = inferTasks(item);
    for (const t of tasks) {
      const taskTitle = `[Task][${item.epic}][${t.role}] ${item.todoId}: ${t.title}`;
      const task = createIssue(
        taskTitle,
        ["type:task", `role:${t.role}`, "priority:P2"],
        taskBody(story.num, t.role, t.title, t.paths),
        "backlog"
      );
      linkSub(story.num, task.id);
    }
    created.push({
      story: story.num,
      tasks: tasks.length,
      plan: item.planSlug,
      todo: item.todoId,
      action: item.action
    });
    console.log(
      `#${story.num} + ${tasks.length} tasks ← ${item.planSlug}/${item.todoId} [${item.action}]`
    );
  }

  await writeFile(
    MANIFEST,
    JSON.stringify({ postedAt: new Date().toISOString(), created: [...prior, ...created] }, null, 2)
  );
  console.log(
    `\nPosted ${created.length} plan stories. Total tasks: ${created.reduce((s, c) => s + c.tasks, 0)}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
