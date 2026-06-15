## Summary

{{one_line}}

## Feature

| Field  | Value               |
| ------ | ------------------- |
| Domain | {{F-XX}} — {{name}} |
| Layer  | {{layer}}           |
| Health | Gap                 |
| MVP    | In scope            |

## PM

- **Priority:** {{P0-P3}}
- **Lane:** backlog
- **Parent epic:** #{{epic_num}}
- **Dependencies:** None
- **Success metric:** {{metric}}

## BA

**User story:** As a {{role}}, I want {{action}}, so that {{benefit}}.

**Acceptance criteria:**

- [ ] **AC-1:** Given {{pre}}, when {{action}}, then {{observable}}
- [ ] **AC-2:** Given {{pre}}, when {{action}}, then {{observable}}
- [ ] **AC-3:** Given {{invalid}}, when {{action}}, then {{error}}

**Spec:** `{{spec_path}}`

**Out of scope:** {{out_of_scope}}

## QA verification matrix

| AC   | Type | Automated      | Manual steps | Pass |
| ---- | ---- | -------------- | ------------ | ---- |
| AC-1 | E2E  | `{{e2e_path}}` | {{manual_1}} | [ ]  |
| AC-2 | E2E  | `{{e2e_path}}` | {{manual_2}} | [ ]  |
| AC-3 | E2E  | `{{e2e_path}}` | {{manual_3}} | [ ]  |

**Regression:** `pnpm test -- {{related_paths}}`

## Dev

| Role | {{role}} |
| Target paths | {{paths}} |
| Contracts | {{contracts}} |

<AGENT_INSTRUCTION role="{{role}}" task_id="GH-{{num}}">

- Target: {{target}}
- TDD: {{test_path}} must fail first; cover AC-1..AC-3
  </AGENT_INSTRUCTION>

## Evidence

{{evidence}}

<SYNC_BLOCK status="TODO" task_id="GH-{{num}}" lane="backlog" />
