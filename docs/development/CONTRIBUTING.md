# Contributing to Kloqra

## Local development

Use Node.js 20+, pnpm 9, PostgreSQL 16+, and Redis 7+ (or the Docker bootstrap).

```bash
pnpm install
pnpm serve:docker # or pnpm serve:native
```

Run split development processes after infrastructure is ready:

```bash
pnpm dev:shared
pnpm dev:api
pnpm --filter @kloqra/app dev
pnpm dev:platform # optional isolated platform console
```

The product is http://localhost:3000, API is http://localhost:3001, and platform operations use
http://localhost:3003.

## Monorepo layout

| Path                  | Purpose                                   |
| --------------------- | ----------------------------------------- |
| `apps/app`            | Unified customer product                  |
| `apps/api`            | NestJS API and sole database write path   |
| `apps/platform-admin` | Isolated internal platform console        |
| `packages/contracts`  | Zod DTO and route source of truth         |
| `packages/ui`         | Shared visual system                      |
| `packages/web-shared` | Shared API/session/stateful web behavior  |
| `docs`                | Architecture, specs, guides, and runbooks |

## Contract-first workflow

1. Update cross-package contracts first.
2. Add or update tests with the change.
3. Implement API behavior in `apps/api`.
4. Implement customer UI in `apps/app` using shared packages.
5. Update the canonical spec and roadmap/task status.

Do not duplicate DTO shapes or treat hidden UI as authorization.

## Pre-PR gate

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Update `docs/specs/` for behavior changes, keep secrets out of commits, and update the roadmap when
a feature ships. See [testing](./TESTING.md), [frontend UI](./FRONTEND-UI.md), and the
[agent playbook](../agent/AGENTS.md).
