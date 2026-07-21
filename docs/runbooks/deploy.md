# Deployment runbook

Kloqra deploys one customer-facing product from `apps/app`. The internal `apps/platform-admin`
console remains a separate deployment with auth scope `platform`.

| Component              | Platform                | Configuration                                        |
| ---------------------- | ----------------------- | ---------------------------------------------------- |
| API, PostgreSQL, Redis | Railway                 | [`railway.toml`](../../railway.toml)                 |
| Product (`apps/app`)   | Vercel                  | [`apps/app/vercel.json`](../../apps/app/vercel.json) |
| Platform operations    | Separate Vercel project | `apps/platform-admin`                                |

## Deployment order

1. Run the repository quality gate.
2. Apply Prisma migrations.
3. Deploy the API and wait for `GET /health`.
4. Deploy `apps/app` with `NEXT_PUBLIC_AUTH_SCOPE=app`.
5. Set the API `PUBLIC_APP_URL` to the exact product origin.
6. Smoke-test member, project-manager, workspace-admin, and tenant-owner/admin journeys.

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
bash scripts/deploy/migrate.sh
bash scripts/deploy/smoke.sh https://api.example.com
```

## Environments

| Environment | Railway project  | Vercel project       | Product root |
| ----------- | ---------------- | -------------------- | ------------ |
| Staging     | `kloqra-staging` | `kloqra-app-staging` | `apps/app`   |
| Production  | `kloqra-prod`    | `kloqra-app`         | `apps/app`   |

Use distinct databases, JWT secrets, and product origins for staging and production.

## Deployment variables

GitHub environments must provide `DATABASE_URL`, `RAILWAY_TOKEN`, `VERCEL_TOKEN`, and
`VERCEL_ORG_ID`. Set `API_URL`, `RAILWAY_SERVICE`, `VERCEL_APP_PROJECT`, and `APP_URL` as
variables. The product requires `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_AUTH_SCOPE=app`.

Production must use Redis, secure cookies, exact CORS origins, and strong independent JWT secrets.
Platform-admin uses `NEXT_PUBLIC_AUTH_SCOPE=platform` and a separate origin.

## Post-deploy smoke

1. Member: sign in, start and stop a timer, and view personal routes.
2. Project manager: manage only assigned projects.
3. Workspace admin: verify approvals, team, reports, and exports.
4. Tenant owner/admin: verify authorized `/account/*` controls.
5. Confirm customer sessions cannot authenticate `apps/platform-admin`.

If the product deployment is unhealthy, revert `apps/app` to its previous Vercel deployment. API
rollback uses the previous Railway deployment. Do not reverse database migrations without a reviewed
DBA plan.

See [Vercel](./vercel.md), [Railway](./railway.md), and [environment variables](../development/ENVIRONMENT.md).
