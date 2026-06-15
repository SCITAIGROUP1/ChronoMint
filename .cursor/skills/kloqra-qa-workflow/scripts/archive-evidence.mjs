#!/usr/bin/env node
/**
 * Create local evidence pack for a GitHub issue (gitignored .qa-evidence/).
 * Usage: node archive-evidence.mjs <issue#> [--env local|staging] [--copy-playwright]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

const issueNum = process.argv[2];
const envIdx = process.argv.indexOf("--env");
const env = envIdx >= 0 ? (process.argv[envIdx + 1] ?? "local") : "local";
const copyPlaywright = process.argv.includes("--copy-playwright");

if (!issueNum || !/^\d+$/.test(issueNum)) {
  console.error(
    "Usage: node archive-evidence.mjs <issue#> [--env local|staging] [--copy-playwright]"
  );
  process.exit(1);
}

const base = path.join(ROOT, ".qa-evidence", `GH-${issueNum}`);
const shots = path.join(base, "screenshots");
const pw = path.join(base, "playwright");

for (const d of [base, shots, pw]) {
  fs.mkdirSync(d, { recursive: true });
}

const manifest = {
  issue: Number(issueNum),
  issueUrl: `https://github.com/SCITAIGROUP1/ChronoMint/issues/${issueNum}`,
  environment: env,
  createdAt: new Date().toISOString(),
  naming: `GH-${issueNum}-AC-<n>-<short-label>.png`,
  uploadTo: "GitHub issue comment attachments",
  policy: "docs/qa/EVIDENCE.md"
};

fs.writeFileSync(path.join(base, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const signoffStub = `# Sign-off stub — GH-${issueNum}

Post this on: ${manifest.issueUrl}

| AC | Result | Evidence |
|----|--------|----------|
| AC-1 | PASS / FAIL | screenshot: GH-${issueNum}-AC-1-....png |
| AC-2 | PASS / FAIL | |
| Regression | PASS / FAIL | command output |

CI: <PR checks URL>
Environment: ${env}

Screenshots in: .qa-evidence/GH-${issueNum}/screenshots/
`;

fs.writeFileSync(path.join(base, "SIGNOFF.md"), signoffStub);

if (copyPlaywright) {
  const clientReport = path.join(ROOT, "apps/client/playwright-report");
  if (fs.existsSync(clientReport)) {
    copyDir(clientReport, path.join(pw, "client"));
    console.log("Copied apps/client/playwright-report → .qa-evidence/.../playwright/client");
  }
  const adminReport = path.join(ROOT, "apps/admin/playwright-report");
  if (fs.existsSync(adminReport)) {
    copyDir(adminReport, path.join(pw, "admin"));
    console.log("Copied apps/admin/playwright-report → .qa-evidence/.../playwright/admin");
  }
}

console.log(`Evidence pack: ${base}`);
console.log(`  manifest.json`);
console.log(`  SIGNOFF.md`);
console.log(`  screenshots/  ← drop GH-${issueNum}-AC-*.png here, then upload to GitHub`);
console.log("");
console.log("Naming: GH-<issue#>-AC-<n>-<short-label>.png");
console.log("Policy: docs/qa/EVIDENCE.md");
console.log("");
console.log(
  `node .cursor/skills/kloqra-qa-workflow/scripts/print-signoff.mjs ${issueNum} --env ${env}`
);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
