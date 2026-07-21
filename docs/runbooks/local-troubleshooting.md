# Local development troubleshooting

## Start the supported topology

Bootstrap with `pnpm serve:docker` or `pnpm serve:native`. For split processes, run:

```bash
pnpm dev:shared
pnpm dev:api
pnpm --filter @kloqra/app dev
```

The product uses http://localhost:3000, the API uses http://localhost:3001, and the isolated
platform console uses http://localhost:3003.

## Database failures

Confirm PostgreSQL is running, create `kloqra`, set `DATABASE_URL`, then run:

```bash
pnpm prisma:migrate
pnpm prisma:generate
pnpm prisma:seed
```

Docker users can run `pnpm docker:reset` to recreate local volumes. This deletes local Docker data.

## Timer failures

Use `REDIS_USE_MEMORY=true` for local development without Redis. With Redis, set
`REDIS_URL=redis://localhost:6379` and remove the in-memory flag.

## CORS or login failures

- API `PUBLIC_APP_URL` must be exactly `http://localhost:3000` locally.
- `apps/app` must use `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`.
- Every customer session must use `NEXT_PUBLIC_AUTH_SCOPE=app` and `X-Auth-Scope: app`.
- Cookie-backed browser requests use `credentials: "include"`.
- Clear site data and sign in again after changing auth variables.

Authenticated workspace requests send a valid Bearer token and `X-Workspace-Id` matching token
context. A mismatch is denied. Platform sessions use scope `platform` and cannot authenticate the
product.

## Shared packages out of date

```bash
pnpm install
pnpm --filter @kloqra/contracts build
pnpm --filter @kloqra/ui build
pnpm --filter @kloqra/web-shared build
```

See [environment variables](../development/ENVIRONMENT.md), [authentication](../architecture/AUTH.md),
and [deployment](./deploy.md).
