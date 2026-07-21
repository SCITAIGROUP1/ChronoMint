# Kloqra App

Next.js 15 product app for personal work, projects, workspace management, billing, exports, and approvals.

## Commands

```bash
# From repo root
pnpm --filter @kloqra/app dev
pnpm --filter @kloqra/app test:e2e
```

## Environment

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_SCOPE=app
```

## Routes

| Path                     | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `/login`                 | Kloqra sign-in                                 |
| `/dashboard`             | Configurable analytics widgets; arrange layout |
| `/team-management`       | Workspace members, roles, invites              |
| `/approvals`             | Pending timesheet approvals                    |
| `/projects`              | Project list; create via modal                 |
| `/projects/:id/tasks`    | Project tasks                                  |
| `/projects/:id/team`     | Project team and invite links                  |
| `/projects/:id/settings` | Project settings and approval config           |
| `/categories`            | Task categories                                |
| `/team`                  | Team Live — real-time activity                 |
| `/billing`               | Hourly rates (paginated table)                 |
| `/exports`               | Multi-report export wizard + invoice PDF       |
| `/workspace`             | Workspace settings; create workspace           |
| `/profile`               | User profile (shared `@kloqra/web-shared`)     |
| `/settings`              | Account settings (appearance, security, …)     |
| `/share/[token]`         | Public export share view                       |

Canonical local URL: http://localhost:3000

## UI patterns

Tables use `DataTableCard` + `usePaginatedList`. Modals use `AppModal`. Toasts via Sonner. See [docs/development/FRONTEND-UI.md](../../docs/development/FRONTEND-UI.md).

## Deploy (Vercel)

Deploy with **Root Directory** `apps/app` and the same API base URL configured for the product app.

See [docs/runbooks/vercel.md](../../docs/runbooks/vercel.md).

## Documentation

- [User guides](../../docs/user-guides/)
- [Export spec](../../docs/specs/export.md)
- [Reporting spec](../../docs/specs/reporting.md)
