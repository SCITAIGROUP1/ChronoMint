#!/usr/bin/env node
/**
 * List ChronoMint issues that are likely in QA lanes (label/heuristic).
 * Full lane status requires GitHub Project API — use Project #4 QA queue view in UI.
 *
 * Usage: node qa-queue.mjs [--repo SCITAIGROUP1/ChronoMint]
 */
import { spawnSync } from "node:child_process";

const repoFlag = process.argv.indexOf("--repo");
const REPO = repoFlag >= 0 ? process.argv[repoFlag + 1] : "SCITAIGROUP1/ChronoMint";

function gh(args) {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr || "gh failed — run: gh auth login && gh auth refresh -s project");
    process.exit(1);
  }
  return r.stdout.trim();
}

const out = gh([
  "issue",
  "list",
  "--repo",
  REPO,
  "--state",
  "open",
  "--limit",
  "100",
  "--json",
  "number,title,labels,url"
]);

const issues = JSON.parse(out || "[]");
const qaLabels = new Set(["role:QA", "qa:needs-verification"]);
const readyTitles = issues.filter((i) => {
  const labels = i.labels?.map((l) => l.name) ?? [];
  return labels.some((l) => qaLabels.has(l)) || /test|QA|verify/i.test(i.title);
});

console.log(`# QA queue hints (${REPO})\n`);
console.log("For lane status, open: https://github.com/orgs/SCITAIGROUP1/projects/4\n");
console.log("| # | Title |");
console.log("|---|-------|");

if (readyTitles.length === 0) {
  console.log("| — | No open issues matched QA heuristics — check Project QA queue view |");
} else {
  for (const i of readyTitles) {
    console.log(`| [#${i.number}](${i.url}) | ${i.title.replace(/\|/g, "\\|")} |`);
  }
}

console.log("\nLanes: ready-for-qa → qa-in-progress → testing → done | qa-failed");
