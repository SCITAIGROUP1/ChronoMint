import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INCLUDED_ROOT_FILES = [
  ".dockerignore",
  ".gitignore",
  "deploy/env.production.example",
  "deploy/env.staging.example",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "render.yaml",
  "turbo.json"
];
const INCLUDED_DIRECTORIES = [".github", "scripts"];
const REMOVED_APP_NAMES = [["ad", "min"].join(""), ["cli", "ent"].join("")];
const LEGACY_REFERENCES = [
  ...REMOVED_APP_NAMES.flatMap((name) => [`@kloqra/${name}`, `apps/${name}`]),
  ...REMOVED_APP_NAMES.flatMap((name) => [
    `PUBLIC_${name.toUpperCase()}_URL`,
    `VERCEL_${name.toUpperCase()}_PROJECT`
  ])
];

function filesUnder(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!statSync(absolutePath).isDirectory()) return [relativePath];
  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relativePath, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
}

test("root automation targets only the canonical product app", () => {
  const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.match(packageJson.scripts.dev, /@kloqra\/app/);
  assert.equal(packageJson.scripts["dev:app"], "pnpm --filter @kloqra/app dev");
  for (const legacyName of REMOVED_APP_NAMES) {
    assert.equal(packageJson.scripts[`dev:${legacyName}`], undefined);
  }

  const files = [...INCLUDED_ROOT_FILES, ...INCLUDED_DIRECTORIES.flatMap(filesUnder)];
  const stale = [];
  for (const file of files) {
    if (file === "scripts/unified-product-config.test.mjs") continue;
    const content = readFileSync(path.join(ROOT, file), "utf8");
    for (const reference of LEGACY_REFERENCES) {
      if (content.includes(reference)) stale.push(`${file}: ${reference}`);
    }
  }
  assert.deepEqual(stale, []);

  const deployWorkflow = readFileSync(path.join(ROOT, ".github/workflows/deploy.yml"), "utf8");
  assert.match(deployWorkflow, /vars\.VERCEL_APP_PROJECT/);
  assert.match(deployWorkflow, /--cwd apps\/app/);
  assert.match(deployWorkflow, /APP_URL: \$\{\{ vars\.APP_URL \}\}/);
});

test("workspace and lockfile omit deleted product frontends", () => {
  const workspace = readFileSync(path.join(ROOT, "pnpm-workspace.yaml"), "utf8");
  assert.match(workspace, /apps\/app/);
  for (const legacyName of REMOVED_APP_NAMES) {
    assert.ok(!workspace.includes(`apps/${legacyName}`));
  }

  const lockfile = readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8");
  for (const legacyName of REMOVED_APP_NAMES) {
    assert.ok(!lockfile.includes(`  apps/${legacyName}:`));
  }
  assert.match(lockfile, /^ {2}apps\/app:/m);
});

test("CORS helper emits one canonical product origin", () => {
  const result = spawnSync(
    "bash",
    [path.join(ROOT, "scripts/deploy/wire-cors.sh"), "https://app.example.com/"],
    { encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "https://app.example.com\n");
});
