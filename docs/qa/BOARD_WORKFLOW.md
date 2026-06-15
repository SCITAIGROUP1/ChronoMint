# Board workflow — QA on Project #4

Source of truth for sprint work: [SCITAIGROUP1 Project #4](https://github.com/orgs/SCITAIGROUP1/projects/4).

## Ten lanes

| #   | Status           | Owner           |
| --- | ---------------- | --------------- |
| 1   | `backlog`        | PM/BA           |
| 2   | `ready`          | PM/BA           |
| 3   | `on-hold`        | PM              |
| 4   | `in-progress`    | Dev             |
| 5   | `in-review`      | Dev             |
| 6   | `ready-for-qa`   | Dev → QA pickup |
| 7   | `qa-in-progress` | QA              |
| 8   | `testing`        | QA              |
| 9   | `qa-failed`      | QA → Dev        |
| 10  | `done`           | QA              |

Exact strings required for agent scripts. See [lanes.md](../../.cursor/skills/kloqra-github-kanban/reference/lanes.md).

## QA queue view

In Project #4 → **+ New view** → filter Status:

`ready-for-qa`, `qa-in-progress`, `testing`, `qa-failed`

Group by Status. Work top-to-bottom within `ready-for-qa`.

## Per-issue verification

1. Open issue — sections **Acceptance criteria** and **QA verification matrix**.
2. **qa-in-progress:** run every row where Type is Contract, Unit, API, or E2E.
3. Confirm CI green on linked PR.
4. **testing:** run Manual steps (local `pnpm serve`).
5. **done:** post sign-off (below); check matrix Pass column `[x]`.

### Sign-off template

```bash
node .cursor/skills/kloqra-qa-workflow/scripts/print-signoff.mjs <issue#> --env local
```

Or paste from [issue-signoff template](../../.cursor/skills/kloqra-qa-workflow/templates/issue-signoff.md).

### Failure

- Move card to `qa-failed`.
- Comment: `AC-2 FAIL` + numbered repro + screenshot.
- File [Bug](https://github.com/SCITAIGROUP1/ChronoMint/issues/new?template=bug.yml) linked as sub-issue.

## PR handoff (dev)

PRs use [.github/pull_request_template.md](../../.github/pull_request_template.md):

- Linked `GH-#`
- Manual test plan copied from issue matrix
- Checkbox: ready for QA after merge

## MVP exclusions

Do not QA budget, billing, revenue, or client portal items. Label `mvp:out-of-scope`, lane `on-hold`.

## Agent skill

Full automation: [.cursor/skills/kloqra-qa-workflow/SKILL.md](../../.cursor/skills/kloqra-qa-workflow/SKILL.md).
