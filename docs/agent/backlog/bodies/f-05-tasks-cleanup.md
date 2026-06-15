## Summary

Remove dead `/tasks` route redirect and orphan TasksPage — members use project tasks tab.

## Feature

| Domain | F-05 — Categories & tasks |
| Layer | Client |
| MVP | In scope |

## PM

- **Priority:** P2
- **Lane:** backlog

## BA

**Acceptance criteria:**

- [ ] **AC-1:** Given a user navigates to `/tasks`, when route resolves, then they land on `/projects` (or route removed with no broken links).
- [ ] **AC-2:** Given codebase search, when complete, then `features/tasks/tasks-page.tsx` is deleted or used — no orphan file.
- [ ] **AC-3:** Given member nav, when inspected, then no link points to removed dead route.

## QA verification matrix

| AC   | Type   | Automated             | Manual steps              | Pass |
| ---- | ------ | --------------------- | ------------------------- | ---- |
| AC-1 | E2E    | client e2e navigation | Visit /tasks              | [ ]  |
| AC-2 | Manual | N/A                   | grep tasks-page imports   | [ ]  |
| AC-3 | Manual | N/A                   | Check workspace-shell nav | [ ]  |

## Dev

| Target | `apps/client/src/app/(workspace)/tasks/`, `features/tasks/` |

<SYNC_BLOCK status="TODO" task_id="GH-XXX" lane="backlog" />
