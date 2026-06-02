# ChronoMint Client

Next.js 15 member app — timer, timesheet, tasks, and personal exports.

## Commands

```bash
# From repo root
pnpm --filter @chronomint/client dev
pnpm --filter @chronomint/client test:e2e
```

## Environment

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Routes

| Path | Purpose |
|------|---------|
| `/login`, `/register` | Authentication |
| `/timer` | Start/stop timer |
| `/timesheet` | Week view, manual entries, export my data |
| `/tasks` | Task list |
| `/projects` | Assigned projects |
| `/invite/[token]` | Accept team invite |

Default URL: http://localhost:3000

## Documentation

- [Member user guides](../../docs/user-guides/member/)
- [Feature specs](../../docs/specs/)
