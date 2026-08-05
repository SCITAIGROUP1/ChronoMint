# Kloqra deployment current state

Kloqra deploys the NestJS API, PostgreSQL, and Redis on Railway and one customer-facing Next.js
product from `apps/app` on Vercel. GitHub Actions orchestrates CI, migrations, deployment, and smoke
checks. `apps/platform-admin` is a separate internal Vercel deployment.

| Component           | Platform | Notes                                                     |
| ------------------- | -------- | --------------------------------------------------------- |
| API                 | Railway  | Container from `apps/api/Dockerfile`; health at `/health` |
| PostgreSQL          | Railway  | System of record through `DATABASE_URL`                   |
| Redis               | Railway  | Timer, presence, pub/sub, and BullMQ                      |
| Product             | Vercel   | `apps/app`, auth scope `app`                              |
| Platform operations | Vercel   | `apps/platform-admin`, auth scope `platform`              |

The API is a long-running process. Multi-instance deployments require shared Redis. Background jobs
currently run in the API process, and local export artifacts are ephemeral container storage. The
proxy must support WebSocket upgrades and long-lived HTTP connections.

Production variables include database/Redis URLs, independent JWT secrets, exact
`PUBLIC_APP_URL`, mail settings, and optional Stripe/Sentry configuration. The product uses
`NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_AUTH_SCOPE=app`.

See [deployment](./deploy.md) for the operational checklist.
