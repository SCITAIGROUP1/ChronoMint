## Summary

{{one_line}}

## Feature

| Field  | Value               |
| ------ | ------------------- |
| Domain | {{F-XX}} — {{name}} |
| Layer  | {{layer}}           |
| MVP    | In scope            |

## PM

- **Priority:** {{P0-P3}}
- **Lane:** ready

## Repro

1. {{step1}}
2. {{step2}}
3. {{step3}}

**Expected:** {{expected}}
**Actual:** {{actual}}

## BA — fix verification

- [ ] **AC-1:** Given {{pre}}, when {{action}}, then {{expected}} — {{actual}} no longer occurs.
- [ ] **AC-2:** Given {{regression_pre}}, when {{action}}, then existing behavior unchanged.

## QA verification matrix

| AC   | Type         | Automated                        | Manual steps          | Pass |
| ---- | ------------ | -------------------------------- | --------------------- | ---- |
| AC-1 | Unit/API/E2E | `{{test_path}}` (new regression) | Repro steps above     | [ ]  |
| AC-2 | Regression   | `{{suite}}`                      | Smoke related feature | [ ]  |

## Dev

| Target | {{paths}} |

<AGENT_INSTRUCTION role="{{role}}" task_id="GH-{{num}}">

- Fix: {{target}}
- TDD: failing test reproducing AC-1 first
  </AGENT_INSTRUCTION>

<SYNC_BLOCK status="TODO" task_id="GH-{{num}}" lane="ready" />
