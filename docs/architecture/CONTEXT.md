# Kloqra architecture context

```mermaid
flowchart TB
  Product[apps/app unified product]
  Platform[apps/platform-admin isolated operations]
  Assistant[apps/assistant-api]
  API[apps/api NestJS]
  PG[(PostgreSQL)]
  Redis[(Redis)]
  Product --> API
  Platform --> API
  API --> Assistant
  API --> PG
  API --> Redis
  Product -. Socket.IO notifications .-> API
```

## Monorepo layout

- `apps/app` — customer product for personal, project, workspace, and organization capabilities
- `apps/api` — sole database write path and background workers
- `apps/platform-admin` — separately deployed internal platform operations console
- `apps/assistant-api` — internal help assistant service
- `packages/contracts` — Zod contract source of truth
- `packages/ui` — shared visual system
- `packages/web-shared` — shared API, session, profile, and realtime behavior

The customer product uses auth scope `app`; platform operations use isolated scope `platform`.
Capability snapshots compose the UI, while the API policy evaluator authorizes every request.
Workspace routes validate token context and `X-Workspace-Id`.

REST remains the source of truth. Domain events publish through Redis and Socket.IO; clients then
invalidate scoped caches and refetch through HTTP.

See [AUTH.md](./AUTH.md), [TENANT_RBAC.md](./TENANT_RBAC.md), [API routes](../api/ROUTES.md), and
[product roadmap](./PRODUCT_ROADMAP.md).
