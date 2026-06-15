# Test environments

Update **staging API URL** when Railway domain changes. Frontends use fixed Vercel project names.

## Local (daily QA)

| Service | URL                   | Notes                |
| ------- | --------------------- | -------------------- |
| Client  | http://localhost:3000 | Member app           |
| Admin   | http://localhost:3002 | Manager app          |
| API     | http://localhost:3001 | Swagger: `/api/docs` |

**Start:** `corepack pnpm serve` (Postgres required — [Postgres.app](https://postgresapp.com/) on Mac).

**Demo accounts** (after `pnpm prisma:seed`):

| Email               | App    | Password      |
| ------------------- | ------ | ------------- |
| `member@kloqra.dev` | Client | `password123` |
| `admin@kloqra.dev`  | Admin  | `password123` |

## Staging (release sign-off)

| Service | URL                                         | Host                     |
| ------- | ------------------------------------------- | ------------------------ |
| Client  | https://kloqra-client-staging.vercel.app    | Vercel                   |
| Admin   | https://kloqra-admin-staging.vercel.app     | Vercel                   |
| API     | `https://<your-staging-api>.up.railway.app` | Railway `kloqra-staging` |

Replace `<your-staging-api>` with the domain from Railway → **kloqra-staging** → API service → Networking.

Setup: [docs/runbooks/railway.md](../runbooks/railway.md) · template: [deploy/env.staging.example](../../deploy/env.staging.example)

**Smoke after deploy:**

```bash
bash scripts/deploy/smoke.sh https://<your-staging-api>.up.railway.app
```

## CI (automated only)

GitHub Actions — no browser access. Artifacts retained 7 days. See [ci-artifacts.md](../../.cursor/skills/kloqra-qa-workflow/reference/ci-artifacts.md).

## Sign-off environment field

Per-issue: `Environment: local` or `Environment: staging — <client URL>`

Release: list both staging client and admin URLs in [release sign-off](../../.cursor/skills/kloqra-qa-workflow/templates/release-signoff.md).
