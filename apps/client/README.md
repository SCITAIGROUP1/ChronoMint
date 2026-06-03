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

| Path                  | Purpose                                   |
| --------------------- | ----------------------------------------- |
| `/login`, `/register` | Authentication                            |
| `/timer`              | Start/stop timer                          |
| `/timesheet`          | Week view, manual entries, export my data |
| `/tasks`              | Task list                                 |
| `/projects`           | Assigned projects                         |
| `/invite/[token]`     | Accept team invite                        |

Default URL: http://localhost:3000

## Deploy (Vercel)

1. Create a Vercel project with **Root Directory** `apps/client`.
2. Enable **Include source files outside of the Root Directory**.
3. Set `NEXT_PUBLIC_API_BASE_URL` to your deployed API URL.

Full guide: [docs/runbooks/vercel.md](../../docs/runbooks/vercel.md).

## Documentation

- [Member user guides](../../docs/user-guides/member/)
- [Feature specs](../../docs/specs/)
