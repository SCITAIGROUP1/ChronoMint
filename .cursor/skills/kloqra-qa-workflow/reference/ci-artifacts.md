# CI artifacts for QA

Pipeline: [.github/workflows/ci.yml](../../../.github/workflows/ci.yml)

**Evidence policy:** Where to paste links and attach screenshots — [docs/qa/EVIDENCE.md](../../../docs/qa/EVIDENCE.md).

## PR Checks (read first)

| Job             | Fails when                                            |
| --------------- | ----------------------------------------------------- |
| **quality**     | format, lint, typecheck, build, bundle budget         |
| **unit**        | Vitest unit + coverage gates (api modules, contracts) |
| **integration** | API Supertest `apps/api/test/*.e2e.ts`                |
| **e2e**         | Playwright admin + client                             |

JUnit summaries appear as check annotations when story #313 (`phase1-reporters-ci`) is complete.

## Download artifacts (workflow run → Artifacts)

| Artifact            | Contents                    | Retention |
| ------------------- | --------------------------- | --------- |
| `coverage`          | api, contracts, ui HTML     | 7 days    |
| `unit-junit`        | api + contracts unit XML    | 7 days    |
| `integration-junit` | api integration XML         | 7 days    |
| `playwright-report` | admin + client HTML + junit | 7 days    |

## Local parity

```bash
pnpm test:coverage      # unit + coverage gates
pnpm test:integration   # API integration (needs Postgres + seed)
pnpm test:prepush       # integration + both Playwright suites
pnpm test:dashboard     # browse reports at :9321
```

## Playwright failure triage

1. Download `playwright-report` artifact
2. Open `index.html` in browser
3. Failed test → trace + screenshot on first retry

Or locally: `apps/{admin,client}/playwright-report/index.html` after `test:e2e`.
