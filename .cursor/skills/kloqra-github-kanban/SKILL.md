---
name: kloqra-github-kanban
description: >-
  Bootstraps and maintains GitHub Projects kanban for Kloqra MVP. Performs
  code-first feature inventory, posts high-quality Epic/Story/Task/Bug issues
  with PM/BA/Dev/QA sections and QA verification matrices, enforces MVP scope
  (no budget/revenue/client-mgmt), and manages 10-lane workflow. Use when
  initializing a board, posting backlog items, moving issues across lanes, or
  auditing feature gaps.
---

# Kloqra GitHub Kanban

## When to use

- Empty or stale GitHub Project board needs population
- User asks for epic/story/task breakdown, kanban setup, or backlog from codebase
- Agent must **post** or **update** GitHub issues with consistent quality
- Sprint dispatch from Project #4 lanes

## MVP scope gate (apply before every issue)

**NEVER create issues for:**

- Budget burn-down, budget alerts, `budgetHours` features
- Billing, hourly rates, revenue, invoices, multi-currency
- External client portal / client org management

If code audit finds gaps in excluded areas, add label `mvp:out-of-scope` and lane **on-hold**.

**MVP in scope:** timer, timelogs, timesheet, approvals, projects, tasks, categories, workspace, auth, presence, hours export, notifications, assistant, onboarding, platform quality.

## Board configuration

- **Org project:** `SCITAIGROUP1` project `4`
- **Repo:** `SCITAIGROUP1/ChronoMint`
- **Lanes (Status field — exact strings):**

  `backlog` | `ready` | `on-hold` | `in-progress` | `in-review` | `ready-for-qa` | `qa-in-progress` | `testing` | `qa-failed` | `done`

Lane details: [reference/lanes.md](reference/lanes.md)

### Lane transition rules

| From           | To             | Actor | Requirement                                         |
| -------------- | -------------- | ----- | --------------------------------------------------- |
| backlog        | ready          | PM/BA | All AC-\* written + QA verification matrix complete |
| ready          | in-progress    | Dev   | Branch `feat/GH-<num>-slug`                         |
| in-progress    | in-review      | Dev   | PR linked in issue                                  |
| in-review      | ready-for-qa   | Dev   | PR merged                                           |
| ready-for-qa   | qa-in-progress | QA    | Matrix reviewed                                     |
| qa-in-progress | testing        | QA    | Automated rows green locally                        |
| testing        | done           | QA    | Every AC row pass + sign-off comment                |
| testing        | qa-failed      | QA    | Comment cites AC-ID + repro                         |
| qa-failed      | in-progress    | Dev   | Fix pushed                                          |
| any            | on-hold        | PM    | Blocker documented                                  |

## Discovery workflow (code-first)

1. `node .cursor/skills/kloqra-github-kanban/scripts/inventory-features.mjs`
2. `node .cursor/skills/kloqra-github-kanban/scripts/inventory-plans.mjs` — parse `.cursor/plans/*.plan.md`
3. For each F-01…F-15, F-X (skip F-09 billing): API, client, admin, contracts, specs, tests
4. Cross-check plans — **code wins**
5. **Ignore** archived `TASK_BOARD.json`
6. Update `docs/agent/FEATURE_INVENTORY.md` before bulk posting

## Issue posting quality standard

### Title format

`[Type][F-XX] Short imperative title` — Types: Epic, Story, Task, Bug

### Body template

Use [templates/story.md](templates/story.md) or [templates/bug.md](templates/bug.md). Required sections:

1. Summary, Feature table, PM
2. BA — user story + **AC-1..N** (Gherkin Given/When/Then)
3. **QA verification matrix** — every AC mapped (see [templates/qa-matrix.md](templates/qa-matrix.md))
4. Dev — paths, MIP handoff
5. Evidence + SYNC_BLOCK

AC rules: [reference/acceptance-criteria.md](reference/acceptance-criteria.md)

### Posting checklist

- [ ] ≥2 AC with IDs; ≥1 negative AC on stories
- [ ] QA matrix complete for every AC
- [ ] MVP scope gate passed
- [ ] Labels: `type:*`, `feature:*`, `role:*`, `priority:*`
- [ ] Added to Project #4 with lane `backlog` (shipped anchors → `done`)

## Bulk post from backlog JSON

```bash
node .cursor/skills/kloqra-github-kanban/scripts/inventory-plans.mjs          # MVP pending gaps
node .cursor/skills/kloqra-github-kanban/scripts/inventory-plans.mjs --all    # every plan file
node .cursor/skills/kloqra-github-kanban/scripts/expand-from-plans.mjs        # skips already in plans-posted.json
node .cursor/skills/kloqra-github-kanban/scripts/expand-breakdown.mjs
node .cursor/skills/kloqra-github-kanban/scripts/post-backlog.mjs
node .cursor/skills/kloqra-github-kanban/scripts/add-to-project.mjs
```

Input: `docs/agent/backlog/github-issues.json`

## gh CLI

```bash
gh auth refresh -s project
gh issue create --repo SCITAIGROUP1/ChronoMint --title "..." --label "..." --body-file issue.md
gh project item-add 4 --owner SCITAIGROUP1 --url <issue-url>
```

See [reference/github-fields.md](reference/github-fields.md)

## Feature domains (MVP)

See [reference/feature-domains.md](reference/feature-domains.md). **F-09 Billing — skip.**

## References

- [kloqra-qa-workflow](../kloqra-qa-workflow/SKILL.md) — AC verification, sign-off, QA lanes 6–9
- [kloqra-feature-delivery](../chronomint-feature-delivery/SKILL.md)
- [kloqra-test-delivery](../chronomint-test-delivery/SKILL.md)
- [docs/qa/](../../../docs/qa/README.md)
- [docs/agent/FEATURE_INVENTORY.md](../../../docs/agent/FEATURE_INVENTORY.md)
- [docs/agent/AGENTS.md](../../../docs/agent/AGENTS.md)
