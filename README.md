# ChronoMint

Next-gen time analytics engine — contract-first monorepo with NestJS API, Next.js client & admin apps.

## Stack

- **API:** NestJS, Prisma, PostgreSQL, Redis
- **Client / Admin:** Next.js 15 (App Router), Zustand, Tailwind v4
- **Shared:** `@chronomint/contracts` (Zod), `@chronomint/ui`

## Quick start (no Docker)

Requires [Postgres.app](https://postgresapp.com/) or local PostgreSQL on port 5432.

**One command** (installs, migrates, seeds, starts all apps):

```bash
pnpm serve
# or: npx pnpm@9.15.0 serve
```

Manual steps if you prefer:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL user (Postgres.app = macOS username)
createdb chronomint   # once
pnpm prisma:migrate && pnpm prisma:seed
pnpm dev
```

`REDIS_USE_MEMORY=true` in `apps/api/.env` runs the timer without Redis/Docker.

## Quick start (Docker)

```bash
docker compose up -d
# Set DATABASE_URL=postgresql://chronomint:chronomint@localhost:5432/chronomint
# Set REDIS_URL=redis://localhost:6379 and remove REDIS_USE_MEMORY
pnpm install && pnpm prisma:migrate && pnpm prisma:seed && pnpm dev
```

| App    | URL                   |
| ------ | --------------------- |
| Client | http://localhost:3000 |
| Admin  | http://localhost:3002 |
| API    | http://localhost:3001 |

**Seed accounts:** `admin@chronomint.dev` / `member@chronomint.dev` — password `password123`

### Client vs admin

| Feature                                     | Client (`:3000`)     | Admin (`:3002`) |
| ------------------------------------------- | -------------------- | --------------- |
| Timer, timesheet, tasks (assigned projects) | Yes                  | No              |
| View assigned projects                      | Yes (`/projects`)    | No              |
| Create projects & team invite links         | No                   | `/projects`     |
| Dashboard charts & summary widgets          | No                   | `/dashboard`    |
| Team live presence                          | No                   | `/team`         |
| Billing rates                               | No                   | `/billing`      |
| Export my timesheet (CSV/Excel/PDF)         | Yes (timesheet page) | No              |
| My week summary                             | Yes (timesheet page) | No              |
| Multi-report export wizard                  | No                   | `/exports`      |

Sign in to admin with **`admin@chronomint.dev`** (member accounts are redirected).

## Docs

**[Documentation hub](docs/README.md)** — start here for full index.

- [Contributing](CONTRIBUTING.md) · [Environment](docs/development/ENVIRONMENT.md) · [Testing](docs/development/TESTING.md)
- [Architecture](docs/architecture/CONTEXT.md) · [API routes](docs/api/ROUTES.md) · [Product roadmap](docs/architecture/PRODUCT_ROADMAP.md)
- [User guides](docs/user-guides/README.md) · [Deploy runbook](docs/runbooks/deploy.md) · [Agent playbook](docs/agent/AGENTS.md)
