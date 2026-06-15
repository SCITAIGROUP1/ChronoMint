#!/usr/bin/env node
/**
 * Parse .cursor/plans/*.plan.md todos; classify pending vs completed;
 * flag superseded plans and MVP exclusions.
 * Output: docs/agent/backlog/plans-inventory.json
 *
 * Flags:
 *   --all   Include superseded/shipped plans, body-only phases, completed-plan rollups
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PLANS_DIR = join(ROOT, ".cursor/plans");
const OUT = join(ROOT, "docs/agent/backlog/plans-inventory.json");
const ALL = process.argv.includes("--all");

const SKIP_PLANS = new Set([
  "timesheet_submissions_workflow_15fe10b0",
  "github_kanban_bootstrap_dbfecb2c",
  "user_settings_management_79030cb7",
  "dedicated_approvals_ux_8977f56c",
  "export_feature_plan_1864d505",
  "export_scale_up_plan_f8a2b1c0",
  "complete_project_documentation_d3c33666",
  "project_hardening_plan_2d9d2bb8",
  "test_pyramid_phase2",
  "auth_token_hardening_6d59ab8f"
]);

/** Pending todos from these plans are shipped — post to done lane */
const SHIPPED_PENDING_PLANS = new Set([
  "github_kanban_bootstrap_dbfecb2c",
  "timesheet_submissions_workflow_15fe10b0",
  "user_settings_management_79030cb7"
]);

const SKIP_TODO_IDS = {
  notifications_inbox_system_0f5fc735: new Set([
    "contracts",
    "prisma",
    "api-module",
    "client-route",
    "admin-route",
    "inbox-ui",
    "settings-ui"
  ])
};

const ON_HOLD_PLANS = new Set(["jira_integration_options_9635311c"]);

const EXCLUDE_RE =
  /\b(budget burn|budget threshold|billing summary|revenue|hourly.?rate|invoice wizard|client.?portal|forge app)\b/i;

const BILLING_TODO_IDS = new Set([
  "p0-billing-guard",
  "p0-hourly-rate-scope",
  "p1-dashboard-budget"
]);

function isMvpExcludedContent(content, todoId, slug) {
  if (BILLING_TODO_IDS.has(todoId)) return true;
  if (/exclude.*\b(budget|billing|revenue)\b|MVP exclusion|out.of.scope|scope only/i.test(content))
    return false;
  return EXCLUDE_RE.test(content) && !slug.includes("notifications");
}

const DUPLICATE_TODO_IDS = new Set(["p0-prisma-dto", "p1-slim-list-dtos"]);

const DUPLICATE_LINKS = {
  "p0-prisma-dto": 200,
  "p1-slim-list-dtos": 230
};

const PLAN_EPIC = {
  api_surface_audit_a1003183: "F-X",
  member_ai_help_bot_851108b2: "F-14",
  testing_coverage_plan_601f0cfb: "F-X",
  brevo_email_setup_656adf10: "F-X",
  admin_member_provisioning_67318806: "F-01",
  notifications_inbox_system_0f5fc735: "F-13",
  assistant_ui_ux_polish_d8ab21af: "F-14",
  performance_optimization_plan_07cae470: "F-X",
  performance_optimization_plan_9c4e242b: "F-X",
  test_coverage_hardening_e657c5ab: "F-X",
  ci_cd_hardening_plan: "F-X",
  motion_polish_pass_a0b83fe3: "F-15",
  hybrid_onboarding_upgrade_9d09cc4b: "F-15",
  timer_stale_autostop: "F-06",
  timer_pause_resume_ui_redesign: "F-06",
  calendar_occupied_slots_ux_261e1990: "F-07",
  dashboard_widget_system_plan: "F-08",
  dashboard_calendar_responsive_f7bfe185: "F-08",
  category_widgets_analytics_2172d1f0: "F-08",
  categories_tasks_restructure_6c897d87: "F-04",
  time_tracker_week_list_81b9ec0a: "F-06",
  account_settings_transform_d4d9a4de: "F-X",
  user_settings_management_79030cb7: "F-X",
  timesheet_submissions_workflow_15fe10b0: "F-03",
  dedicated_approvals_ux_8977f56c: "F-03",
  export_feature_plan_1864d505: "F-12",
  export_scale_up_plan_f8a2b1c0: "F-12",
  github_kanban_bootstrap_dbfecb2c: "F-X",
  qa_workflow_plan_31ba9f35: "F-X",
  kloqra_brand_rebrand_0119fd2b: "F-15",
  member_ux_rollup_578eef9f: "F-15",
  dark_theme_palette_refresh_182aaaa0: "F-15",
  chronomint_deploy_plan_61d940cc: "F-X",
  level_up_improvement_plan: "F-X",
  next_level_up_plan: "F-X",
  project_hardening_plan_2d9d2bb8: "F-X",
  complete_project_documentation_d3c33666: "F-X",
  auth_token_hardening_6d59ab8f: "F-01"
};

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { meta: {}, body: text, todos: [] };
  const fm = m[1];
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const overview = fm.match(/^overview:\s*(.+)$/m)?.[1]?.trim();
  const todos = [];
  const todoRe = /- id:\s*(\S+)\s*\n\s*content:\s*(.+?)\s*\n\s*status:\s*(\w+)/gs;
  let t;
  while ((t = todoRe.exec(fm))) {
    todos.push({ id: t[1], content: t[2].replace(/^["']|["']$/g, ""), status: t[3] });
  }
  return { meta: { name, overview }, todos, body: text.slice(m[0].length) };
}

function planSlug(filename) {
  return filename.replace(/\.plan\.md$/, "");
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Extract synthetic todos from markdown body when frontmatter has none */
function extractBodyTodos(body, planSlugName) {
  const out = [];
  const phaseRe = /^## Phase (\d+) — (.+)$/gm;
  let m;
  while ((m = phaseRe.exec(body))) {
    out.push({
      id: `phase-${m[1]}`,
      content: `Phase ${m[1]}: ${m[2].trim()}`,
      status: "pending",
      synthetic: true
    });
  }
  if (out.length) return out;

  const moduleRe = /^### MODULE ([A-Z]) — (.+)$/gm;
  while ((m = moduleRe.exec(body))) {
    out.push({
      id: `module-${m[1].toLowerCase()}`,
      content: `Module ${m[1]}: ${m[2].trim()}`,
      status: "pending",
      synthetic: true
    });
  }
  if (out.length) return out;

  const dimRe = /^## Dimension (\d+) — (.+)$/gm;
  while ((m = dimRe.exec(body))) {
    out.push({
      id: `dim-${m[1]}`,
      content: `Dimension ${m[1]}: ${m[2].trim()}`,
      status: "pending",
      synthetic: true
    });
  }
  if (out.length) return out;

  // ci_cd_hardening_plan style numbered sections
  const sectionRe = /^## (\d+)\. (.+)$/gm;
  while ((m = sectionRe.exec(body))) {
    if (m[2].length < 80) {
      out.push({
        id: `section-${m[1]}`,
        content: `${m[1]}. ${m[2].trim()}`,
        status: "pending",
        synthetic: true
      });
    }
  }

  if (!out.length && planSlugName === "timer_pause_resume_ui_redesign") {
    out.push({
      id: "full-plan",
      content: "Timer pause/resume UI redesign (see plan body)",
      status: "pending",
      synthetic: true
    });
  }

  // next_level_up_plan: #### A1. Title sprint items
  const sprintItemRe = /^#### ([A-Z][0-9]+)\. (.+)$/gm;
  while ((m = sprintItemRe.exec(body))) {
    out.push({
      id: `sprint-${m[1].toLowerCase()}`,
      content: `${m[1]}. ${m[2].trim()}`,
      status: "pending",
      synthetic: true
    });
  }

  return out;
}

function classifyTodo(entry, ctx) {
  const { slug, todo, planSkip, onHold } = ctx;

  if (todo.status !== "pending") {
    if (ALL && ctx.planNeverPosted && ctx.allCompletedInPlan) {
      entry.action = "rollup_completed";
      entry.lane = "done";
      return;
    }
    entry.action = "skip_completed";
    return;
  }

  if (isMvpExcludedContent(todo.content, todo.id, slug)) {
    entry.action = "on_hold_post_mvp";
    entry.lane = "on-hold";
    return;
  }

  if (DUPLICATE_TODO_IDS.has(todo.id)) {
    entry.action = "skip_duplicate_board";
    entry.duplicateOf = DUPLICATE_LINKS[todo.id];
    return;
  }

  if (ALL && SHIPPED_PENDING_PLANS.has(slug)) {
    entry.action = "post_done";
    entry.lane = "done";
    return;
  }

  if (ALL && SKIP_TODO_IDS[slug]?.has(todo.id)) {
    entry.action = "post_done";
    entry.lane = "done";
    return;
  }

  if (!ALL && planSkip) {
    entry.action = "skip_superseded_plan";
    return;
  }

  if (!ALL && SKIP_TODO_IDS[slug]?.has(todo.id)) {
    entry.action = "skip_superseded_todo";
    return;
  }

  if (onHold) {
    entry.action = "on_hold_post_mvp";
    entry.lane = "on-hold";
    return;
  }

  if (todo.id === "dispatch-admin" && /budget threshold/i.test(todo.content)) {
    entry.content = todo.content.replace(/,?\s*budget threshold/i, "");
  }

  entry.action = "post";
  entry.lane = todo.id.startsWith("p0") ? "ready" : "backlog";
}

async function main() {
  const files = (await readdir(PLANS_DIR)).filter((f) => f.endsWith(".plan.md"));
  const items = [];
  let skipped = 0;

  for (const file of files.sort()) {
    const slug = planSlug(file);
    const raw = await readFile(join(PLANS_DIR, file), "utf8");
    const { meta, todos: fmTodos, body } = parseFrontmatter(raw);
    let todos = fmTodos.length ? fmTodos : ALL ? extractBodyTodos(body, slug) : [];
    const planSkip = !ALL && SKIP_PLANS.has(slug);
    const onHold = ON_HOLD_PLANS.has(slug);
    const allCompletedInPlan = todos.length > 0 && todos.every((t) => t.status !== "pending");
    const planNeverPosted = true; // expand-from-plans dedupes via plans-posted.json

    if (ALL && allCompletedInPlan && todos.length > 0) {
      items.push({
        planFile: `.cursor/plans/${file}`,
        planSlug: slug,
        planName: meta.name ?? slug,
        todoId: "__rollup__",
        content: `Shipped plan rollup: ${meta.name ?? slug} (${todos.length} todos completed)`,
        status: "completed",
        epic: PLAN_EPIC[slug] ?? "F-X",
        action: "rollup_done",
        lane: "done",
        rollupTodos: todos.map((t) => ({ id: t.id, content: t.content }))
      });
      continue;
    }

    for (const todo of todos) {
      const entry = {
        planFile: `.cursor/plans/${file}`,
        planSlug: slug,
        planName: meta.name,
        todoId: todo.id,
        content: todo.content,
        status: todo.status,
        epic: PLAN_EPIC[slug] ?? "F-X",
        synthetic: todo.synthetic ?? false
      };

      classifyTodo(entry, { slug, todo, planSkip, onHold, allCompletedInPlan, planNeverPosted });

      if (entry.action?.startsWith("skip")) skipped++;
      items.push(entry);
    }
  }

  const postable = (a) => ["post", "post_done", "on_hold_post_mvp", "rollup_done"].includes(a);

  const out = {
    generatedAt: new Date().toISOString(),
    source: ".cursor/plans/*.plan.md",
    mode: ALL ? "all" : "mvp",
    summary: {
      total: items.length,
      toPost: items.filter((i) => i.action === "post").length,
      toPostDone: items.filter((i) => i.action === "post_done").length,
      rollupDone: items.filter((i) => i.action === "rollup_done").length,
      onHold: items.filter((i) => i.action === "on_hold_post_mvp").length,
      skipped
    },
    items
  };
  await writeFile(OUT, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT} (mode=${out.mode})`);
  console.log(
    `Post: ${out.summary.toPost}, done: ${out.summary.toPostDone}, rollup: ${out.summary.rollupDone}, on-hold: ${out.summary.onHold}, skipped: ${skipped}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
