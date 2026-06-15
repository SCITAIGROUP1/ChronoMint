#!/usr/bin/env node
/**
 * Print per-issue QA sign-off comment template.
 * Usage: node print-signoff.mjs <issue#> [--env local|staging] [--acs 3]
 */
const issue = process.argv[2];
if (!issue || !/^\d+$/.test(issue)) {
  console.error("Usage: node print-signoff.mjs <issue#> [--env local|staging] [--acs N]");
  process.exit(1);
}

const envIdx = process.argv.indexOf("--env");
const env = envIdx >= 0 ? (process.argv[envIdx + 1] ?? "local") : "local";
const acsIdx = process.argv.indexOf("--acs");
const acCount = acsIdx >= 0 ? Number(process.argv[acsIdx + 1] ?? 3) : 3;

const lines = [
  `QA sign-off GH-${issue}`,
  `Environment: ${env}`,
  `Tester: — ${new Date().toISOString().slice(0, 10)}`,
  "",
  "| AC | Result | Evidence |",
  "|----|--------|----------|"
];

for (let i = 1; i <= acCount; i++) {
  lines.push(`| AC-${i} | PASS / FAIL | |`);
}
lines.push("| Regression | PASS / FAIL | command or screenshot |");
lines.push("");
lines.push("Gate: pnpm format:check && pnpm lint && typecheck && test && build — PASS / FAIL");
lines.push("CI: <PR checks link>");
lines.push("");
lines.push("Matrix: all rows checked [x] on issue body.");

console.log(lines.join("\n"));
