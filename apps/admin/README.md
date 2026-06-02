# ChronoMint Admin

Next.js 15 workspace admin app — projects, dashboard, team live, billing, exports.

## Commands

```bash
# From repo root
pnpm --filter @chronomint/admin dev
```

## Environment

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Routes

| Path | Purpose |
|------|---------|
| `/login` | Admin sign-in (`ADMIN` workspace role) |
| `/dashboard` | Analytics and summary widgets |
| `/projects` | Create projects, team invites |
| `/team` | Live presence |
| `/billing` | Hourly rates |
| `/exports` | Multi-report export wizard |
| `/workspace` | Workspace members |

Default URL: http://localhost:3002

## Deploy (Vercel)

Separate Vercel project from the client app; **Root Directory** `apps/admin`, same API env var.

See [docs/runbooks/vercel.md](../../docs/runbooks/vercel.md).

## Documentation

- [Admin user guides](../../docs/user-guides/admin/)
- [Export spec](../../docs/specs/export.md)
