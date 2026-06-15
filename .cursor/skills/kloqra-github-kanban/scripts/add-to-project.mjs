#!/usr/bin/env node
/**
 * Add posted issues to GitHub Project #4 and set Status lane.
 * Requires: gh auth refresh -h github.com -s read:project,project
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const POSTED = join(ROOT, "docs/agent/backlog/posted.json");
const OWNER = "SCITAIGROUP1";
const PROJECT_NUM = 4;

function gh(args) {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return (r.stdout || "").trim();
}

async function main() {
  const { issues } = JSON.parse(await readFile(POSTED, "utf8"));

  const projectJson = gh([
    "api",
    "graphql",
    "-f",
    `query=query { organization(login:"${OWNER}") { projectV2(number:${PROJECT_NUM}) { id fields(first:30) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }`
  ]);
  const data = JSON.parse(projectJson).data.organization.projectV2;
  const projectId = data.id;
  const statusField = data.fields.nodes.find((n) => n?.name === "Status");
  if (!statusField) {
    console.error("No Status field on project. Create it in GitHub UI with 10 lane options.");
    process.exit(1);
  }

  for (const issue of issues) {
    if (issue.state === "closed") continue;
    const url = issue.url;
    const addOut = gh([
      "project",
      "item-add",
      String(PROJECT_NUM),
      "--owner",
      OWNER,
      "--url",
      url,
      "--format",
      "json"
    ]);
    const item = JSON.parse(addOut);
    const itemId = item.id;
    const lane = issue.lane;
    const opt = statusField.options.find((o) => o.name === lane);
    if (!opt) {
      console.warn(`Lane "${lane}" not found for #${issue.number}; set manually`);
      continue;
    }
    gh([
      "api",
      "graphql",
      "-f",
      `query=mutation($project:ID!,$item:ID!,$field:ID!,$opt:String!) { updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$opt}}) { projectV2Item { id } } }`,
      "-f",
      `project=${projectId}`,
      "-f",
      `item=${itemId}`,
      "-f",
      `field=${statusField.id}`,
      "-f",
      `opt=${opt.id}`
    ]);
    console.log(`#${issue.number} → ${lane}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  console.error("\nRun: gh auth refresh -h github.com -s read:project,project");
  process.exit(1);
});
