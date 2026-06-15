# Bug triage

Bugs use the [Bug issue template](https://github.com/SCITAIGROUP1/ChronoMint/issues/new?template=bug.yml) with **fix-verification AC-1** and a QA matrix regression row.

**Evidence:** Screenshots and failure naming — [EVIDENCE.md](EVIDENCE.md#bug-evidence).

## Priority (labels: `priority:P0` … `P3`)

| Label  | Meaning                                       | QA action                            |
| ------ | --------------------------------------------- | ------------------------------------ |
| **P0** | Blocker — cannot ship; data loss; auth broken | Stop release; card stays `qa-failed` |
| **P1** | Major feature broken; no workaround           | Fix before sprint end                |
| **P2** | Wrong behavior with workaround                | Schedule next sprint                 |
| **P3** | Cosmetic / minor                              | Backlog                              |

Map to sign-off: P0 open on release branch → **NO** merge.

## Type labels

| Label              | Use                                                  |
| ------------------ | ---------------------------------------------------- |
| `type:bug`         | Defect (template default)                            |
| `type:story`       | New behavior — use Story template instead            |
| `mvp:out-of-scope` | Budget/billing/client portal — do not triage for MVP |

## Optional QA labels

| Label                   | Use                                             |
| ----------------------- | ----------------------------------------------- |
| `qa:needs-verification` | Hotfix merged; needs retest outside normal lane |
| `qa:verified`           | Fix confirmed on local or staging               |

## Bug vs failed story

| Situation                | Action                                               |
| ------------------------ | ---------------------------------------------------- |
| AC fails during story QA | Parent → `qa-failed`; comment `AC-N FAIL`            |
| Regression after `done`  | New `[Bug][F-XX]` issue; link to original story      |
| Production/staging only  | Bug template Environment = `staging` or `production` |

## Required bug fields

From template + testing guide:

1. App — client / admin / api
2. Environment — local / staging / production
3. Account + workspace
4. Steps to reproduce
5. Expected vs actual
6. Fix verification AC-1
7. QA matrix with regression test row

## Regression → test

When bug is fixed, dev adds automated test per matrix **Type**:

| Type     | Path                                |
| -------- | ----------------------------------- |
| E2E      | `apps/{admin,client}/e2e/*.spec.ts` |
| API      | `apps/api/test/*.e2e.ts`            |
| Unit     | `*.spec.ts` beside service          |
| Contract | `packages/contracts/src/*.spec.ts`  |

QA verifies new row before closing bug and retesting parent story.

## Board placement

- New bug → Project #4, lane `backlog` or `ready-for-qa` if hotfix ready
- Sub-issue under parent story when found in `testing`

Agent workflow: [kloqra-qa-workflow SKILL.md](../../.cursor/skills/kloqra-qa-workflow/SKILL.md)
