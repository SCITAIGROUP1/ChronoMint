## Summary

Reconcile PRODUCT_ROADMAP.md with shipped MVP code — move timesheet workflow to Shipped; note member export gap.

## Feature

| Field  | Value                    |
| ------ | ------------------------ |
| Domain | F-X — Platform & quality |
| Layer  | Docs                     |
| MVP    | In scope                 |

## PM

- **Priority:** P2
- **Lane:** ready
- **Success metric:** Roadmap matches FEATURE_INVENTORY.md

## BA

**Acceptance criteria:**

- [ ] **AC-1:** Given PRODUCT_ROADMAP.md, when Phase C is read, then timesheet submit/approve is listed under Shipped with links to timelogs spec.
- [ ] **AC-2:** Given member export row, when read, then status reflects "API shipped; client UI unwired" or Shipped after F-12 completes.
- [ ] **AC-3:** Given Phase B/D items, when read, then budget/revenue/client portal items are marked deferred/post-MVP.

## QA verification matrix

| AC   | Type   | Automated | Manual steps                          | Pass |
| ---- | ------ | --------- | ------------------------------------- | ---- |
| AC-1 | Manual | N/A       | Read roadmap Phase C section          | [ ]  |
| AC-2 | Manual | N/A       | Read Shipped table member export      | [ ]  |
| AC-3 | Manual | N/A       | No new billing stories implied as MVP | [ ]  |

## Dev

| Role | BA |
| Target | `docs/architecture/PRODUCT_ROADMAP.md`, cross-link `docs/agent/FEATURE_INVENTORY.md` |

<SYNC_BLOCK status="TODO" task_id="GH-XXX" lane="ready" />
