## Summary

Add unit tests for PresenceService — module currently has zero specs.

## Feature

| Field  | Value                       |
| ------ | --------------------------- |
| Domain | F-11 — Presence & team live |
| Layer  | API                         |
| Health | Gap                         |
| MVP    | In scope                    |

## PM

- **Priority:** P1
- **Lane:** ready
- **Success metric:** `presence.service.spec.ts` covers snapshot + stream helpers

## BA

**User story:** As QA, I want automated tests on presence logic, so that team live regressions are caught in CI.

**Acceptance criteria:**

- [ ] **AC-1:** Given mocked Redis timer state, when `getSnapshot` is called, then returned DTO matches `PresenceSnapshotDto` schema.
- [ ] **AC-2:** Given no active timers, when snapshot is built, then member list is empty or idle — not undefined.
- [ ] **AC-3:** Given invalid workspace scope, when service is invoked, then appropriate domain error is thrown.

**Spec:** `docs/specs/presence.md`

## QA verification matrix

| AC   | Type       | Automated                                                                  | Manual steps | Pass |
| ---- | ---------- | -------------------------------------------------------------------------- | ------------ | ---- |
| AC-1 | Unit       | `apps/api/src/modules/presence/application/presence.service.spec.ts` (new) | N/A          | [ ]  |
| AC-2 | Unit       | same file — empty state case                                               | N/A          | [ ]  |
| AC-3 | Unit       | same file — forbidden workspace                                            | N/A          | [ ]  |
| —    | Regression | `pnpm --filter @kloqra/api test presence`                                  | CI green     | [ ]  |

## Dev

| Role | QA (TDD) then BE if needed |
| Target | `apps/api/src/modules/presence/application/presence.service.ts` |

<AGENT_INSTRUCTION role="QA" task_id="GH-XXX">

- Write failing presence.service.spec.ts covering AC-1..3
  </AGENT_INSTRUCTION>

<SYNC_BLOCK status="TODO" task_id="GH-XXX" lane="ready" />
