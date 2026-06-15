#!/usr/bin/env node
/**
 * Validate issue markdown has acceptance criteria and QA verification matrix.
 * Usage: node verify-matrix.mjs <file.md>
 *        node verify-matrix.mjs --stdin  (pipe issue body)
 */
import fs from "node:fs";

let body = "";
const file = process.argv[2];

if (file === "--stdin") {
  body = fs.readFileSync(0, "utf8");
} else if (file && fs.existsSync(file)) {
  body = fs.readFileSync(file, "utf8");
} else {
  console.error("Usage: node verify-matrix.mjs <issue-body.md> | node verify-matrix.mjs --stdin");
  process.exit(1);
}

const errors = [];

if (!/AC-\d+/i.test(body)) {
  errors.push("Missing AC-N acceptance criteria IDs");
}
if (!/QA verification matrix/i.test(body)) {
  errors.push("Missing 'QA verification matrix' section");
}
if (!/\|\s*AC\s*\|/i.test(body) && !/\|\s*Type\s*\|/i.test(body)) {
  errors.push("Missing matrix table header");
}
const acIds = [...body.matchAll(/\bAC-(\d+)\b/gi)].map((m) => m[1]);
const uniqueAc = [...new Set(acIds)];
if (uniqueAc.length < 1) {
  errors.push("Need at least one AC-* in body");
}

if (errors.length) {
  console.error("verify-matrix: FAIL");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `verify-matrix: OK (${uniqueAc.length} AC id(s): ${uniqueAc.map((n) => `AC-${n}`).join(", ")})`
);
