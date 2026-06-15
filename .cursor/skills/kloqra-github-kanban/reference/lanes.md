# Kanban lanes — Project #4

Use these **exact** Status values (lowercase, hyphenated).

| Lane             | Purpose                                  | Typical owner |
| ---------------- | ---------------------------------------- | ------------- |
| `backlog`        | Captured, not sprint-ready               | PM/BA         |
| `ready`          | AC + QA matrix complete; pickable        | PM/BA         |
| `on-hold`        | Blocked or post-MVP (`mvp:out-of-scope`) | PM            |
| `in-progress`    | Active dev branch                        | LSA/BE/FE     |
| `in-review`      | PR open                                  | Dev           |
| `ready-for-qa`   | Merged; awaiting QA pickup               | Dev           |
| `qa-in-progress` | QA writing/running automated tests       | QA            |
| `testing`        | Manual verification + matrix sign-off    | QA            |
| `qa-failed`      | Defect; cite AC-ID in comment            | QA → Dev      |
| `done`           | All AC pass; gate green                  | QA            |

## Flow

```
backlog → ready → in-progress → in-review → ready-for-qa
  → qa-in-progress → testing → done
testing → qa-failed → in-progress (fix) → ready-for-qa
any → on-hold → backlog | ready
```

## Doc-only BA work

PRODUCT_ROADMAP edits may skip QA lanes: `ready` → `in-progress` → `done`.
