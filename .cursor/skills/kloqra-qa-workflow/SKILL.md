---
name: kloqra-qa-workflow
description: >-
  Runs Kloqra QA on GitHub Project #4 — AC-driven verification per issue, QA
  queue triage, automated matrix execution, manual staging sign-off, bug filing,
  lane transitions (ready-for-qa through done), and issue walkthroughs (how to
  test #N, epic vs story). Use when acting as QA, verifying a story, explaining
  how to test a GitHub issue, signing off a release, triaging CI failures, or
  filing regressions.
---

# Kloqra QA Workflow

Unique flow: **every story ships through AC-ID verification on Project #4**, not ad-hoc smoke only.

## When to use

- Pick up work from **QA queue** (`ready-for-qa` → `done`)
- User asks **“how do we test issue #N?”** or **“walk through QA for #198”**
- Verify merged PR against issue **QA verification matrix**
- Post per-issue or release **sign-off** on GitHub
- File `[Bug][F-XX]` with fix-verification AC
- Run automated rows before manual rows
- Sprint-end staging regression

## Issue walkthrough (user asks “how to test #N”)

1. Run scaffold: `node .cursor/skills/kloqra-qa-workflow/scripts/issue-walkthrough.mjs <N>`
2. Read issue body (gh or `docs/agent/backlog/bodies/`)
3. **Classify:** `[Epic]` → QA tests **child stories** only; `[Story]`/`[Task]`/`[Bug]` → QA tests **this** issue
4. Respond using [reference/issue-walkthrough-format.md](reference/issue-walkthrough-format.md) — full example: [docs/qa/examples/WALKTHROUGH_EPIC_198_STORY_199.md](../../../docs/qa/examples/WALKTHROUGH_EPIC_198_STORY_199.md)

**Epic rule:** Never run AC matrix on the epic card. Point to sub-issues (e.g. #198 epic → #199 story).

## Relationship to other skills

| Skill                                                                 | Role                                                |
| --------------------------------------------------------------------- | --------------------------------------------------- |
| [kloqra-github-kanban](../kloqra-github-kanban/SKILL.md)              | Posts issues, AC format, lane names, MVP scope gate |
| [kloqra-test-delivery](../chronomint-test-delivery/SKILL.md)          | Dev TDD — QA validates tests exist and pass         |
| [docs/qa/](../../../docs/qa/README.md)                                | Human-readable hub                                  |
| [docs/qa/QA_ENGINEER_GUIDE.md](../../../docs/qa/QA_ENGINEER_GUIDE.md) | QA engineer manual + automated guideline            |

**Board:** [SCITAIGROUP1 Project #4](https://github.com/orgs/SCITAIGROUP1/projects/4) · **Repo:** `SCITAIGROUP1/ChronoMint`

## MVP scope gate (before any QA work)

Same as kanban skill — **do not verify or file** budget, billing, revenue, client portal work. Tag `mvp:out-of-scope` → `on-hold`.

## QA lanes (your territory)

Lanes 6–9 of the 10-lane board. Full map: [reference/qa-lanes.md](reference/qa-lanes.md)

| Lane             | You do                                                |
| ---------------- | ----------------------------------------------------- |
| `ready-for-qa`   | Read matrix; assign self; → `qa-in-progress`          |
| `qa-in-progress` | Run **Automated** matrix rows + confirm CI green      |
| `testing`        | Run **Manual** rows (local; staging if deploy config) |
| `done`           | Post sign-off; check matrix `[x]`                     |
| `qa-failed`      | Comment `AC-N FAIL` + repro; link bug sub-issue       |

**Gate:** No `done` without sign-off comment on the issue.

## Daily workflow

### 1. Queue triage

```bash
# Optional: list open QA-lane issues (requires gh + project scope)
node .cursor/skills/kloqra-qa-workflow/scripts/qa-queue.mjs
```

Or open Project #4 → **QA queue** view (filter: `ready-for-qa`, `qa-in-progress`, `testing`, `qa-failed`).

Pick oldest `ready-for-qa` → move to `qa-in-progress`.

### 2. Per-issue verification

1. Open linked issue — read **Acceptance criteria** (`AC-1`, `AC-2`, …).
2. Read **QA verification matrix** table.
3. Run every **Automated** row (commands in matrix Type column):

```bash
pnpm test -- <path>                    # unit
pnpm test:integration                  # API Supertest suite
pnpm --filter @kloqra/client test:e2e --grep "..."
pnpm --filter @kloqra/admin test:e2e --grep "..."
pnpm test:prepush                      # full CI-parity before release
```

4. Confirm PR **Checks** green (quality, unit, integration, e2e).
5. On automated pass → move to `testing`.
6. Execute **Manual** rows on local (`pnpm serve`). Staging for release-bound or email/deploy items — see [ENVIRONMENTS.md](../../../docs/qa/ENVIRONMENTS.md).
7. On all pass → `done` + sign-off comment (step 3).
8. On fail → `qa-failed` + repro citing `AC-N`.

### 3. Sign-off

```bash
node .cursor/skills/kloqra-qa-workflow/scripts/print-signoff.mjs 199 --env local
```

Paste output as issue comment. Templates: [templates/issue-signoff.md](templates/issue-signoff.md), [templates/release-signoff.md](templates/release-signoff.md).

Evidence policy (attachments, naming, CI links): [docs/qa/EVIDENCE.md](../../../docs/qa/EVIDENCE.md)

Optional local pack before GitHub upload:

```bash
node .cursor/skills/kloqra-qa-workflow/scripts/archive-evidence.mjs <issue#> --env local --copy-playwright
```

### 4. Bug found during testing

1. File via [Bug issue template](https://github.com/SCITAIGROUP1/ChronoMint/issues/new?template=bug.yml).
2. Title: `[Bug][F-XX] Short description`
3. Include fix-verification **AC-1** + QA matrix with regression test row.
4. Link as sub-issue under parent story.
5. Parent stays `qa-failed` until bug closed and matrix retested.

## Regression policy

| Matrix Type | Dev must add before `done`              |
| ----------- | --------------------------------------- |
| E2E         | `apps/{admin,client}/e2e/*.spec.ts`     |
| API         | `apps/api/test/*.e2e.ts` or `*.spec.ts` |
| Contract    | `packages/contracts/src/*.spec.ts`      |
| Unit        | `*.spec.ts` beside service              |

QA verifies new **Automated** row passes before sign-off.

## Release sign-off (sprint end)

After all sprint issues `done` or explicitly deferred:

1. Confirm staging deployed — [RELEASE_PROCESS.md](../../../docs/qa/RELEASE_PROCESS.md)
2. Run client + admin smoke from [testing-guide.md](../../../docs/user-guides/qa/testing-guide.md)
3. Post release sign-off on release PR using [templates/release-signoff.md](templates/release-signoff.md)

**Block:** No merge to `staging`/`main` with open `priority:P0` or parent in `qa-failed`.

## Artifacts

| Source                    | What                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------- |
| **GitHub issue comments** | Sign-off + screenshots (system of record) — [EVIDENCE.md](../../../docs/qa/EVIDENCE.md) |
| PR Checks tab             | quality / unit / integration / e2e job status                                           |
| CI artifacts (7d)         | `coverage`, `unit-junit`, `integration-junit`, `playwright-report`                      |
| Local (gitignored)        | `pnpm test:dashboard` → http://localhost:9321; `.qa-evidence/GH-<n>/` optional pack     |

## Scripts

| Script                                                         | Purpose                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| [scripts/qa-queue.mjs](scripts/qa-queue.mjs)                   | List issues in QA lanes via `gh`                          |
| [scripts/print-signoff.mjs](scripts/print-signoff.mjs)         | Generate sign-off comment for issue #                     |
| [scripts/verify-matrix.mjs](scripts/verify-matrix.mjs)         | Check issue body has AC + matrix (CI/local)               |
| [scripts/issue-walkthrough.mjs](scripts/issue-walkthrough.mjs) | Scaffold “how to test #N” walkthrough                     |
| [scripts/archive-evidence.mjs](scripts/archive-evidence.mjs)   | Optional `.qa-evidence/GH-<n>/` pack before GitHub upload |

## References

- [docs/qa/examples/WALKTHROUGH_EPIC_198_STORY_199.md](../../../docs/qa/examples/WALKTHROUGH_EPIC_198_STORY_199.md) — full sample flow (Epic #198 → Story #199)
- [docs/qa/EVIDENCE.md](../../../docs/qa/EVIDENCE.md) — evidence policy (naming, attachments, retention)
- [reference/issue-walkthrough-format.md](reference/issue-walkthrough-format.md) — agent response template for “test issue #N”
- [reference/qa-lanes.md](reference/qa-lanes.md) — transitions and gates
- [reference/ci-artifacts.md](reference/ci-artifacts.md) — reading failures
- [docs/qa/BUG_TRIAGE.md](../../../docs/qa/BUG_TRIAGE.md) — P0–P3, labels
