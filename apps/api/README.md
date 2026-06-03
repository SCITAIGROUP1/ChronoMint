# ChronoMint API

NestJS application — sole write path to PostgreSQL and Redis (timer state).

## Commands

```bash
# From repo root
pnpm --filter @chronomint/api dev
pnpm prisma:migrate
pnpm prisma:seed
pnpm --filter @chronomint/api test
pnpm --filter @chronomint/api test:e2e
```

## Environment

See [docs/development/ENVIRONMENT.md](../../docs/development/ENVIRONMENT.md). Copy `.env.example` to `.env`.

Default URL: http://localhost:3001

## Modules

| Module    | Path                 | Responsibility                            |
| --------- | -------------------- | ----------------------------------------- |
| health    | `modules/health/`    | `GET /health`                             |
| auth      | `modules/auth/`      | Register, login, refresh, logout, me      |
| workspace | `modules/workspace/` | Workspace list, members, invites          |
| projects  | `modules/projects/`  | Projects, teams, team invites             |
| tasks     | `modules/tasks/`     | Tasks per project                         |
| timelogs  | `modules/timelogs/`  | Time log CRUD                             |
| timer     | `modules/timer/`     | Start/stop/active timer (Redis or memory) |
| billing   | `modules/billing/`   | Hourly rates, billing summary             |
| reporting | `modules/reporting/` | Dashboard and personal reporting          |
| presence  | `modules/presence/`  | Team live snapshot and SSE stream         |
| export    | `modules/export/`    | Admin and member file exports             |

Each module follows: `application/`, `interface/http/`, optional `infrastructure/`.

## Contracts

DTOs and routes: `packages/contracts`. Controllers import `ROUTES` and Zod schemas from `@chronomint/contracts`.

## Documentation

- [API routes](../../docs/api/ROUTES.md)
- [Feature specs](../../docs/specs/)
- [Architecture](../../docs/architecture/CONTEXT.md)
