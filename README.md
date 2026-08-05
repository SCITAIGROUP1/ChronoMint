# Kloqra

Next-generation time analytics platform with a NestJS API and one capability-driven Next.js product.

## Stack

- **API:** NestJS, Prisma, PostgreSQL, Redis
- **Product:** `apps/app` (`@kloqra/app`), Next.js 15, Zustand, Tailwind v4
- **Shared:** `@kloqra/contracts`, `@kloqra/ui`, `@kloqra/web-shared`

## Quick start

```bash
pnpm install
pnpm serve:docker # or pnpm serve:native
```

For daily development, prepare dependencies and run the product and API in separate terminals:

```bash
pnpm dev:shared
pnpm dev:api
pnpm --filter @kloqra/app dev
```

- Product: http://localhost:3000
- API: http://localhost:3001
- Platform admin, when started separately: http://localhost:3003

All customer personas sign in through the product with auth scope `app`. Members receive personal
workflows; project managers and workspace/tenant administrators receive only their authorized
management capabilities. `apps/platform-admin` remains isolated with scope `platform`.

Seed accounts: `admin@kloqra.dev` and `member@kloqra.dev`, password `password123`.

## Documentation

Start at the [documentation hub](docs/README.md). Key references: [contributing](docs/development/CONTRIBUTING.md),
[environment](docs/development/ENVIRONMENT.md), [testing](docs/development/TESTING.md),
[architecture](docs/architecture/CONTEXT.md), and [deployment](docs/runbooks/deploy.md).
