#!/usr/bin/env node
/**
 * Post issues from docs/agent/backlog/github-issues.json via gh CLI.
 * Usage:
 *   node post-backlog.mjs --dry-run
 *   node post-backlog.mjs
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const BACKLOG = join(ROOT, "docs/agent/backlog/github-issues.json");
const REPO = "SCITAIGROUP1/ChronoMint";
const PROJECT = { owner: "SCITAIGROUP1", number: 4 };
const dryRun = process.argv.includes("--dry-run");

function gh(args) {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `gh ${args.join(" ")} failed`);
  }
  return (r.stdout || "").trim();
}

async function main() {
  const raw = await readFile(BACKLOG, "utf8");
  const { issues } = JSON.parse(raw);

  if (dryRun) {
    console.log(`Would create ${issues.length} issues on ${REPO}`);
    for (const i of issues) console.log(`  [${i.type}] ${i.title} → lane ${i.lane}`);
    return;
  }

  try {
    gh(["auth", "status"]);
  } catch {
    console.error("gh CLI not available. Install: brew install gh && gh auth login");
    console.error("Issue bodies are in docs/agent/backlog/bodies/ for manual paste.");
    process.exit(1);
  }

  const created = [];
  for (const issue of issues) {
    const bodyPath = join(ROOT, issue.bodyFile);
    const labels = issue.labels.join(",");
    const url = gh([
      "issue",
      "create",
      "--repo",
      REPO,
      "--title",
      issue.title,
      "--label",
      labels,
      "--body-file",
      bodyPath
    ]);
    console.log("Created:", url);
    try {
      gh(["project", "item-add", String(PROJECT.number), "--owner", PROJECT.owner, "--url", url]);
    } catch (e) {
      console.warn("Could not add to project:", e.message);
    }
    created.push({ ...issue, url });
  }

  console.log(`\nCreated ${created.length} issues. Set Status lane in Project #4 UI.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
