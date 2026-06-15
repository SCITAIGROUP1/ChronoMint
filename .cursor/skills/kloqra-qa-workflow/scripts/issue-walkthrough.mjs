#!/usr/bin/env node
/**
 * Print QA walkthrough scaffold for a GitHub issue.
 * Usage: node issue-walkthrough.mjs <issue#>
 *
 * Fetches title/body via gh when available; falls back to backlog manifest.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");
const REPO = "SCITAIGROUP1/ChronoMint";

const issueNum = process.argv[2];
if (!issueNum || !/^\d+$/.test(issueNum)) {
  console.error("Usage: node issue-walkthrough.mjs <issue#>");
  process.exit(1);
}

function gh(args) {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) return null;
  return (r.stdout || "").trim();
}

const ISSUE_BODY_MAP = {
  198: "docs/agent/backlog/bodies/epic-f-12.md",
  199: "docs/agent/backlog/bodies/f-12-wire-export.md",
  200: "docs/agent/backlog/bodies/f-x-prisma-dto.md",
  201: "docs/agent/backlog/bodies/f-11-presence-tests.md",
  202: "docs/agent/backlog/bodies/f-x-roadmap-reconcile.md",
  203: "docs/agent/backlog/bodies/f-10-week-summary.md",
  204: "docs/agent/backlog/bodies/f-05-tasks-cleanup.md"
};

function loadPosted() {
  const posted = path.join(ROOT, "docs/agent/backlog/posted.json");
  if (!fs.existsSync(posted)) return [];
  try {
    return JSON.parse(fs.readFileSync(posted, "utf8")).issues ?? [];
  } catch {
    return [];
  }
}

function loadBodyForIssue(num) {
  const key = String(num);
  const rel = ISSUE_BODY_MAP[key] ?? ISSUE_BODY_MAP[Number(num)];
  if (rel) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  const posted = loadPosted().find((i) => String(i.number) === num);
  if (posted?.bodyFile) {
    const p = path.join(ROOT, posted.bodyFile);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  return "";
}

function detectType(title) {
  if (/\[Epic\]/i.test(title)) return "epic";
  if (/\[Story\]/i.test(title)) return "story";
  if (/\[Task\]/i.test(title)) return "task";
  if (/\[Bug\]/i.test(title)) return "bug";
  return "unknown";
}

function extractAcs(body) {
  return [...body.matchAll(/\*\*AC-(\d+):?\*\*/gi)].map((m) => `AC-${m[1]}`);
}

function extractMatrixCommands(body) {
  const lines = body.split("\n");
  const cmds = [];
  for (const line of lines) {
    if (line.startsWith("|") && !line.includes("---") && !/^\|\s*AC\s*\|/i.test(line)) {
      const cols = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 3 && /^AC-|\d|Regression|—/i.test(cols[0])) {
        cmds.push({ ac: cols[0], type: cols[1] ?? "", automated: cols[2] ?? "" });
      }
    }
  }
  return cmds;
}

const json = gh(["issue", "view", issueNum, "--repo", REPO, "--json", "title,body,url,labels"]);

let title = `Issue #${issueNum}`;
let body = "";
let url = `https://github.com/${REPO}/issues/${issueNum}`;

if (json) {
  try {
    const data = JSON.parse(json);
    title = data.title ?? title;
    body = data.body ?? "";
    url = data.url ?? url;
  } catch {
    /* fallback */
  }
} else {
  const posted = loadPosted().find((i) => String(i.number) === issueNum);
  if (posted) {
    title = posted.title;
    url = posted.url;
  }
  body = loadBodyForIssue(issueNum);
  if (!body && !json)
    console.error("# Note: gh unavailable — using local backlog body if mapped\n");
}

if (!body) body = loadBodyForIssue(issueNum);

const type = detectType(title);
const acs = extractAcs(body);
const matrix = extractMatrixCommands(body);

const childHint =
  type === "epic"
    ? `
## Epic vs story

| Issue | Type | QA tests directly? |
|-------|------|--------------------|
| #${issueNum} | **Epic** | **No** — track child stories |
| _(child story)_ | **Story** | **Yes** — pick sub-issue in \`ready-for-qa\` |

Find sub-issues on GitHub → issue #${issueNum} → Development / sub-issues.
QA runs automated + manual on **stories**, not the epic card.
${issueNum === "198" ? "\n**Full sample flow:** docs/qa/examples/WALKTHROUGH_EPIC_198_STORY_199.md (Epic #198 → Story #199)\n" : ""}
`
    : `
## Issue type: ${type}

QA tests this issue **directly** (automated → manual → sign-off on #${issueNum}).
`;

console.log(`# QA walkthrough — ${title}

**URL:** ${url}
**Guide:** docs/qa/QA_ENGINEER_GUIDE.md
${childHint}

## Board lanes

\`\`\`text
ready-for-qa → qa-in-progress → testing → done
              (fail) qa-failed
\`\`\`

## Per-issue checklist

\`\`\`text
[ ] Read AC + matrix on issue
[ ] PR Checks green
[ ] qa-in-progress: run automated rows
[ ] testing: manual browser steps
[ ] Sign-off posted
[ ] Card → done
\`\`\`

## Automated flow (qa-in-progress)

| AC | Command |
|----|---------|
${
  matrix.length
    ? matrix
        .filter((r) => r.automated && !/^manual$/i.test(r.type))
        .map((r) => `| ${r.ac} | \`${r.automated}\` |`)
        .join("\n")
    : "| _(parse matrix from issue body)_ | |"
}

\`\`\`bash
corepack pnpm serve   # Terminal 1
# Terminal 2 — from matrix above
node .cursor/skills/kloqra-qa-workflow/scripts/print-signoff.mjs ${issueNum} --env local --acs ${Math.max(acs.length, 1)}
\`\`\`

## Manual flow (testing)

${acs.length ? acs.map((ac) => `- **${ac}:** _(steps from matrix Manual column)_`).join("\n") : "- _(copy Manual steps from issue matrix)_"}

## Sign-off

Post comment on #${issueNum} → move card to **done**.

${
  type === "epic"
    ? `\n## Epic closure\n\n#${issueNum} → done when **all child stories** are QA-signed-off.\n`
    : ""
}
`);
