# Kloqra

Next-gen time analytics engine — contract-first monorepo with NestJS API, Next.js client & admin apps.

## Stack

- **API:** NestJS, Prisma, PostgreSQL, Redis
- **Client / Admin:** Next.js 15 (App Router), Zustand, Tailwind v4
- **Shared:** `@kloqra/contracts` (Zod), `@kloqra/ui`, `@kloqra/web-shared`

## Quick start (no Docker)

Requires [Postgres.app](https://postgresapp.com/) or local PostgreSQL on port 5432.

**Daily dev** (prep once, then one watcher per terminal — no migrate/seed):

```bash
pnpm local          # prep: Postgres, env, prisma generate
pnpm dev:shared     # terminal 1 — contracts + ui watch (start first)
pnpm dev:api        # terminal 2 → :3001  (nest --watch)
pnpm dev:client     # terminal 3 → :3000  (next dev)
pnpm dev:admin      # terminal 4 → :3002  (next dev)
```

Or all apps in one terminal: `pnpm dev` (one-shot shared build via `predev`).

**First-time / DB setup** (install, migrate, seed, then start):

```bash
pnpm serve
# or: npx pnpm@9.15.0 serve
```

Manual steps if you prefer:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL user (Postgres.app = macOS username)
createdb kloqra   # once
pnpm prisma:migrate && pnpm prisma:seed
pnpm local
```

`REDIS_USE_MEMORY=true` in `apps/api/.env` runs the timer without Redis/Docker.

## Quick start (Docker)

```bash
docker compose up -d
# Set DATABASE_URL=postgresql://kloqra:kloqra@localhost:5432/kloqra
# Set REDIS_URL=redis://localhost:6379 and remove REDIS_USE_MEMORY
pnpm install && pnpm prisma:migrate && pnpm prisma:seed && pnpm dev
```

| App    | URL                   |
| ------ | --------------------- |
| Client | http://localhost:3000 |
| Admin  | http://localhost:3002 |
| API    | http://localhost:3001 |

**Seed accounts:** `admin@kloqra.dev` / `member@kloqra.dev` — password `password123` (primary workspace: **Acme Corporation**)

### Client vs admin

| Feature                                   | Client (`:3000`)     | Admin (`:3002`) |
| ----------------------------------------- | -------------------- | --------------- |
| Timer, timesheet, time tracker            | Yes                  | No              |
| Member dashboard widgets                  | Yes (`/dashboard`)   | No              |
| Submit timesheets for approval            | Yes (`/approvals`)   | No              |
| View assigned projects & tasks            | Yes                  | No              |
| Profile & account settings                | Yes                  | Yes             |
| Create projects, categories, team invites | No                   | Yes             |
| Team management & timesheet approvals     | No                   | Yes             |
| Dashboard analytics widgets               | No                   | `/dashboard`    |
| Team live presence                        | No                   | `/team`         |
| Billing rates                             | No                   | `/billing`      |
| Export my timesheet (CSV/Excel/PDF)       | Yes (timesheet page) | No              |
| Multi-report export & invoice wizard      | No                   | `/exports`      |

Sign in to admin with **`admin@kloqra.dev`** (member accounts are redirected).

## Docs

**[Documentation hub](docs/README.md)** — start here for full index.

- [Contributing](CONTRIBUTING.md) · [Environment](docs/development/ENVIRONMENT.md) · [Testing](docs/development/TESTING.md) · [Frontend UI](docs/development/FRONTEND-UI.md)
- [Architecture](docs/architecture/CONTEXT.md) · [API routes](docs/api/ROUTES.md) · [Product roadmap](docs/architecture/PRODUCT_ROADMAP.md)
- [User guides](docs/user-guides/README.md) · [Deploy runbook](docs/runbooks/deploy.md) · [Agent playbook](docs/agent/AGENTS.md)
