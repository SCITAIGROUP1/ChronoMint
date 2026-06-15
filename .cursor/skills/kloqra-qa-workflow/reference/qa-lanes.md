# QA lanes — Project #4

Exact Status strings (lowercase, hyphenated). Dev lanes 1–5: see [kloqra-github-kanban/reference/lanes.md](../../kloqra-github-kanban/reference/lanes.md).

## QA-owned transitions

| From             | To               | Requirement                                                              |
| ---------------- | ---------------- | ------------------------------------------------------------------------ |
| `ready-for-qa`   | `qa-in-progress` | Matrix read; tester assigned                                             |
| `qa-in-progress` | `testing`        | All **Automated** matrix rows green locally; CI green on linked PR/merge |
| `testing`        | `done`           | All **Manual** rows pass; sign-off comment posted; matrix `[x]` checked  |
| `testing`        | `qa-failed`      | Comment: `AC-N FAIL` + numbered repro + screenshot if UI                 |
| `qa-failed`      | `in-progress`    | Dev pushes fix (new PR)                                                  |
| `qa-failed`      | `ready-for-qa`   | Retest only — no code change                                             |

## AC / matrix gates

| Transition       | Gate                                                |
| ---------------- | --------------------------------------------------- |
| → `ready-for-qa` | Dev merged PR; automated test paths named in matrix |
| → `testing`      | `pnpm test` paths from matrix pass                  |
| → `done`         | Every AC row PASS in sign-off comment               |

## Doc-only exceptions

BA stories (e.g. roadmap reconcile) may skip QA lanes: `ready` → `in-progress` → `done`.

## QA queue view (Project #4)

Create filter: Status is any of:

- `ready-for-qa`
- `qa-in-progress`
- `testing`
- `qa-failed`

Sort: oldest `ready-for-qa` first.
