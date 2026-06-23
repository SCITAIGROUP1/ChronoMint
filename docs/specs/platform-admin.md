# Platform admin (SaaS-F14+)

Internal Kloqra staff console at `apps/platform-admin` (port **3003** locally).

## Auth

| Setting | Value                                             |
| ------- | ------------------------------------------------- |
| App     | `apps/platform-admin`                             |
| Scope   | `NEXT_PUBLIC_AUTH_SCOPE=platform`                 |
| Cookies | `access_token_platform`, `refresh_token_platform` |
| JWT     | `typ: "platform"`, `platformRole: SUPERADMIN`     |
| Users   | `platform_users` table (not tenant `users`)       |

Login uses existing `POST /auth/login` with `X-Auth-Scope: platform`. Tenant member credentials are rejected unless a matching `platform_users` row exists.

## API

| Method | Route                           | Guard           |
| ------ | ------------------------------- | --------------- |
| GET    | `/platform/tenants`             | `PlatformGuard` |
| GET    | `/platform/tenants/:id`         | `PlatformGuard` |
| POST   | `/platform/tenants`             | `PlatformGuard` |
| PATCH  | `/platform/tenants/:id`         | `PlatformGuard` |
| POST   | `/platform/tenants/:id/suspend` | `PlatformGuard` |
| GET    | `/platform/plans`               | `PlatformGuard` |
| GET    | `/platform/audit-events`        | `PlatformGuard` |

Mutations and audit logging are **F15–F16**.

## Audit log (F16)

- Every successful tenant create/update/suspend/churn and platform login is appended to `platform_audit_events`.
- UI: **Audit log** nav item — paginated table with action and tenant filters.
- **No platform impersonation** (D13). Workspace admin impersonation remains on `/auth/impersonate` only.

## Local dev

```bash
pnpm dev:api          # :3001
pnpm dev:platform     # :3003
pnpm prisma:seed      # seeds platform@kloqra.dev / password123
```

Ensure `FRONTEND_ORIGIN` includes `http://localhost:3003`.

## Deploy runbook (stub)

- Separate Vercel project or internal Railway service — **not** the customer admin URL.
- Set `NEXT_PUBLIC_AUTH_SCOPE=platform`, `NEXT_PUBLIC_API_BASE_URL` to production API.
- `robots.txt` disallows all paths.
- Restrict access via VPN / IP allowlist on staging (production gate TBD).

## Support runbooks

- [superadmin-support.md](../runbooks/superadmin-support.md)
- [tenant-churn.md](../runbooks/tenant-churn.md)

## Tests

- API: `apps/api/test/platform-auth.e2e.ts`, `platform-tenants.e2e.ts`, `platform-audit.e2e.ts`
- UI: `apps/platform-admin/e2e/platform-login.spec.ts`, `platform-audit.spec.ts`
