# Acceptance criteria & QA verification

## AC rules

| Rule         | Requirement                                          |
| ------------ | ---------------------------------------------------- |
| ID           | Prefix `AC-1`, `AC-2`, …                             |
| Format       | Gherkin: Given / When / Then                         |
| Testable     | Observable: URL, status code, file, label, test name |
| Negative     | ≥1 error/denied AC per story                         |
| Traceability | Every AC has a QA matrix row                         |

**Good:** Given a MEMBER on `/timesheet` with logs, when Export is clicked, then a `.csv` downloads with Date, Project, Task, Duration.

**Bad:** Export works correctly.

## QA matrix columns

| AC  | Type | Automated | Manual steps | Pass |
| --- | ---- | --------- | ------------ | ---- |

**Types:** Contract | Unit | API | E2E | Manual | Regression

## Patterns by layer

| Layer     | Minimum ACs                         | Automated hook                     |
| --------- | ----------------------------------- | ---------------------------------- |
| Contracts | Valid parses; invalid rejects       | `packages/contracts/src/*.spec.ts` |
| API       | 200 + shape; 401/403; 404           | `apps/api/test/*.e2e.ts`           |
| Client    | Element visible; interaction; error | `apps/client/e2e/*.spec.ts`        |
| Admin     | Same + ADMIN gate                   | `apps/admin/e2e/*.spec.ts`         |
| Bug       | Repro before fix; AC-1 after        | New regression test                |

## Seed accounts (manual QA)

From README after `pnpm serve`:

- Member: `member@seed.kloqra` / `password123`
- Admin: `admin@seed.kloqra` / `password123`

## QA sign-off (testing → done)

```
QA sign-off GH-<issue>:
- AC-1: PASS — evidence: ...
- AC-2: PASS — evidence: ...
- pnpm format:check && lint && typecheck && test && build: PASS
```

## Bug AC format

**AC-1 (fix verification):** Given [pre], when [action], then [expected] — [actual before fix] no longer occurs.
