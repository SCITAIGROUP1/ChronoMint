# Testing

## Commands

From the repository root:

```bash
pnpm test          # unit tests (all packages)
pnpm test:e2e      # API e2e + client Playwright
```

## Unit tests

| Location                               | What it covers                                          |
| -------------------------------------- | ------------------------------------------------------- |
| `packages/contracts/src/**/*.spec.ts`  | Zod schemas, export filename helpers                    |
| `apps/api/src/modules/**/**/*.spec.ts` | Export rendering, reporting totals, timelogs overlap    |
| Other packages                         | Run `pnpm --filter <package> test` for a single package |

API tests use Vitest. Example modules with specs:

- `apps/api/src/modules/export/application/`
- `apps/api/src/modules/reporting/application/reporting.service.spec.ts`
- `apps/api/src/modules/timelogs/application/timelogs.service.spec.ts`

## End-to-end tests

### API (`apps/api`)

- Config: `apps/api/vitest.e2e.config.ts`
- Test: `apps/api/test/health.e2e.ts` — `GET /health` returns OK
- Run: `pnpm --filter @chronomint/api test:e2e`

Requires a running database (same `DATABASE_URL` as dev).

### Client (`apps/client`)

- Playwright: `apps/client/e2e/smoke.spec.ts` — login page loads
- Run: `pnpm --filter @chronomint/client test:e2e`

Start the client dev server separately or configure Playwright `webServer` in `playwright.config.ts` if present.

## Seed data for manual QA

After `pnpm prisma:seed`:

| Account                 | Password      | Role             |
| ----------------------- | ------------- | ---------------- |
| `admin@chronomint.dev`  | `password123` | Workspace ADMIN  |
| `member@chronomint.dev` | `password123` | Workspace MEMBER |

Use admin on http://localhost:3002 and member on http://localhost:3000.

## What to test for new features

1. Contract validation (invalid body → 400 with error code).
2. RBAC (member cannot call admin-only routes).
3. Workspace isolation (no cross-workspace data leakage).
4. For reporting/export: totals match between dashboard and export for the same date range.

## CI expectations

A healthy PR should pass:

- `pnpm lint`
- `pnpm test`
- `pnpm build`

E2e may be optional in CI depending on pipeline setup; run locally before release.
