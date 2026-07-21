# Environment variables

## API (`apps/api`)

Copy `apps/api/.env.example` to `apps/api/.env`.

Required production values include `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, and exact `PUBLIC_APP_URL`. Local API defaults to port 3001 and can use
`REDIS_USE_MEMORY=true`; production must use shared Redis.

`PUBLIC_APP_URL` resolves to the canonical product `APP_URL` and is used for generated links and
browser-origin checks.

Mail uses SMTP or Brevo configuration. Stripe variables enable paid subscription flows. Keep
`HARD_AUTO_STOP_HOURS` aligned with `NEXT_PUBLIC_HARD_AUTO_STOP_HOURS`.

## Product (`apps/app`)

Copy `apps/app/.env.example` to `apps/app/.env.local`.

| Variable                                 | Required | Description                                                  |
| ---------------------------------------- | -------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL`               | Yes      | API URL; local default `http://localhost:3001`               |
| `NEXT_PUBLIC_AUTH_SCOPE`                 | Yes      | Must be `app` for every customer persona                     |
| `NEXT_PUBLIC_APP_URL`                    | No       | Canonical product URL; local default `http://localhost:3000` |
| `NEXT_PUBLIC_HARD_AUTO_STOP_HOURS`       | No       | Must match the API timer ceiling                             |
| `NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES` | No       | Match API commercial-feature configuration                   |

## Platform admin (`apps/platform-admin`)

Use `NEXT_PUBLIC_AUTH_SCOPE=platform` and `NEXT_PUBLIC_API_BASE_URL`. The console is isolated from
product sessions and runs locally on port 3003.

## Local ports

| Service        | URL                   |
| -------------- | --------------------- |
| Product        | http://localhost:3000 |
| API            | http://localhost:3001 |
| Platform admin | http://localhost:3003 |

## Database and seed

```bash
createdb kloqra
pnpm prisma:migrate
pnpm prisma:seed
```

Seed accounts are `admin@kloqra.dev` and `member@kloqra.dev`, password `password123`. CI uses the
`kloqra_test` database and applies migrations before integration and browser tests.

Production requires secure cookies, exact origins, strong unique JWT secrets, and migrations before
API startup. See [security](./SECURITY.md) and [deployment](../runbooks/deploy.md).
