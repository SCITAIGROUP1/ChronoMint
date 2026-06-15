# GitHub backlog bootstrap

Pre-built MVP issues for [Project #4](https://github.com/orgs/SCITAIGROUP1/projects/4).

## Files

| File                 | Purpose                                |
| -------------------- | -------------------------------------- |
| `github-issues.json` | Issue manifest (titles, labels, lanes) |
| `bodies/*.md`        | Full issue bodies with AC + QA matrix  |

## Post issues

### Full breakdown (Epic → Story → Task)

```bash
node .cursor/skills/kloqra-github-kanban/scripts/expand-breakdown.mjs
```

Hierarchy on GitHub:

- **Epic** — feature domain (F-01…F-15, F-X)
- **Story** — user-facing gap or shipped baseline
- **Task** — role slice (QA → BE/FE) linked as sub-issue under story

Expand script posted #206–#242 (see `posted-full.json` after run).

### From `.cursor/plans` (full coverage)

```bash
# MVP slice (pending gaps only)
node .cursor/skills/kloqra-github-kanban/scripts/inventory-plans.mjs
node .cursor/skills/kloqra-github-kanban/scripts/expand-from-plans.mjs

# ALL plans: shipped rollups (done), body phases, on-hold billing, backlog gaps
node .cursor/skills/kloqra-github-kanban/scripts/inventory-plans.mjs --all
node .cursor/skills/kloqra-github-kanban/scripts/expand-from-plans.mjs --dry-run
node .cursor/skills/kloqra-github-kanban/scripts/expand-from-plans.mjs
```

**Wave 1 (MVP gaps):** #243–#330 — 39 plan stories + tasks from active plans.

**Wave 2 (`--all`):** #333–#494 — 100 additional stories:

- 23 **rollup** anchors (shipped plans → `done`)
- 24 **post_done** (shipped pending todos → `done`)
- 8 **on-hold** (billing/budget API audit items)
- 45 **backlog** (CI/CD, dashboard widgets, timer autostop, QA workflow, level-up sprints)

See `plans-inventory.json` and `plans-posted.json` (139 plan stories total).

### Posted 2026-06-15 (initial)

| #                                                             | Title                     | Lane       |
| ------------------------------------------------------------- | ------------------------- | ---------- |
| [#198](https://github.com/SCITAIGROUP1/ChronoMint/issues/198) | Epic F-12 Export          | backlog    |
| [#199](https://github.com/SCITAIGROUP1/ChronoMint/issues/199) | Wire timesheet CSV export | ready      |
| [#200](https://github.com/SCITAIGROUP1/ChronoMint/issues/200) | Prisma DTO mappers        | ready      |
| [#201](https://github.com/SCITAIGROUP1/ChronoMint/issues/201) | Presence unit tests       | ready      |
| [#202](https://github.com/SCITAIGROUP1/ChronoMint/issues/202) | Roadmap reconcile         | **closed** |
| [#203](https://github.com/SCITAIGROUP1/ChronoMint/issues/203) | MyWeekSummary widget      | backlog    |
| [#204](https://github.com/SCITAIGROUP1/ChronoMint/issues/204) | /tasks cleanup            | backlog    |

See `posted.json` for machine-readable manifest.

### Add to Project #4 (requires project scope)

```bash
gh auth refresh -h github.com -s read:project,project
node .cursor/skills/kloqra-github-kanban/scripts/add-to-project.mjs
```

Or drag issues into https://github.com/orgs/SCITAIGROUP1/projects/4 and set Status lanes.

### With gh CLI (re-post)

```bash
gh auth login
gh auth refresh -s project
node .cursor/skills/kloqra-github-kanban/scripts/post-backlog.mjs --dry-run
node .cursor/skills/kloqra-github-kanban/scripts/post-backlog.mjs
```

### Manual (no gh)

1. Open https://github.com/SCITAIGROUP1/ChronoMint/issues/new/choose
2. Pick **Story** / **Epic** template (or paste body from `bodies/`)
3. Add to Project #4
4. Set **Status** lane per `github-issues.json` → `lane` field

## Configure Project #4 lanes (one-time)

Create Status field options in order:

`backlog` | `ready` | `on-hold` | `in-progress` | `in-review` | `ready-for-qa` | `qa-in-progress` | `testing` | `qa-failed` | `done`

See `.cursor/skills/kloqra-github-kanban/reference/github-fields.md`

## Ready column (first sprint)

| Body file                  | Lane  |
| -------------------------- | ----- |
| `f-12-wire-export.md`      | ready |
| `f-x-prisma-dto.md`        | ready |
| `f-11-presence-tests.md`   | ready |
| `f-x-roadmap-reconcile.md` | ready |

## MVP exclusions

Do not file: budget, revenue, billing, client portal (`mvp:out-of-scope`).
