# Testing

For non-technical persona checks, see the [QA guide](../user-guides/qa/testing-guide.md).

## Commands

```bash
pnpm test
pnpm test:coverage
pnpm test:integration
pnpm test:e2e
pnpm test:prepush
pnpm test:dashboard
pnpm --filter @kloqra/app test:e2e
pnpm --filter @kloqra/app test:e2e:ui
```

The product Playwright suite lives in `apps/app/e2e` and runs against product port 3000 with
`NEXT_PUBLIC_AUTH_SCOPE=app`. It covers member, project-manager, workspace-admin, tenant-role,
capability composition, direct-link authorization, and migrated feature parity.

## CI stages

1. `quality`: format, lint, typecheck, and build.
2. `unit`: coverage and JUnit artifacts.
3. `integration`: migrate, seed, and run API Supertest coverage.
4. `e2e`: migrate, seed, start API and `apps/app`, then run Playwright persona journeys.

API integration tests live under `apps/api/test`. Unit tests remain colocated with contracts, UI,
web-shared, API modules, and product features. Staged production changes require matching tests
through the pre-commit gate.

## Full verification

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm test:prepush && pnpm build
```

After seeding, use `admin@kloqra.dev` and `member@kloqra.dev` with password `password123`.
`apps/platform-admin` has separate isolation and platform-role coverage.
