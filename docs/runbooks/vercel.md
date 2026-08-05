# Deploy the product on Vercel

Kloqra has one customer-facing Next.js product in `apps/app`. Every customer persona uses this
deployment with auth scope `app`; capabilities control presentation while the API enforces access.
`apps/platform-admin` remains a separate internal deployment with auth scope `platform`.

## Product project

1. Import the repository into Vercel.
2. Set **Root Directory** to `apps/app`.
3. Enable source files outside the root directory for workspace packages.
4. Build with `pnpm --filter @kloqra/app... build`.
5. Configure the variables below and attach the canonical product domain.
6. Set that exact origin as API `PUBLIC_APP_URL`.

| Variable                                 | Value                                         |
| ---------------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`               | Exact HTTPS API URL, without trailing slash   |
| `NEXT_PUBLIC_AUTH_SCOPE`                 | `app`                                         |
| `NEXT_PUBLIC_APP_URL`                    | Canonical product URL used by generated links |
| `NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES` | Match the API commercial-feature setting      |

The deploy workflow uses `VERCEL_APP_PROJECT` and `APP_URL`.

## CORS and cookies

```env
PUBLIC_APP_URL=https://app.example.com
AUTH_COOKIE_SAME_SITE=none
AUTH_COOKIE_SECURE=true
REFRESH_ROTATION_GRACE_MS=10000
```

`PUBLIC_APP_URL` must resolve to the canonical `APP_URL`. Do not set `COOKIE_DOMAIN` for a
Vercel-plus-Railway topology.

## CLI deploy

```bash
pnpm exec vercel link --cwd apps/app
pnpm exec vercel deploy --prod --cwd apps/app
```

## Smoke test

Test member, project-manager, workspace-admin, and tenant-owner/admin capabilities at `APP_URL`.
Confirm platform operations are unavailable from the product session and direct unauthorized API
requests remain denied.

See [deployment](./deploy.md) and [environment variables](../development/ENVIRONMENT.md).
