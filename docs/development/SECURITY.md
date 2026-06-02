# Security

## Secrets

- Never commit `.env`, `.env.local`, or credentials to git.
- Use `apps/api/.env.example` and frontend `.env.example` as templates only.
- Production: generate cryptographically random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (minimum 32 characters).

## Authentication

| Mechanism | Purpose |
|-----------|---------|
| JWT access token | Short-lived API authorization (`JWT_ACCESS_EXPIRES`, default 15m) |
| JWT refresh token | httpOnly cookie; renews access via `POST /auth/refresh` |
| Password storage | bcrypt hash in `users.password_hash` |

Access token can be sent as:

- `Authorization: Bearer <token>`, or
- `access_token` httpOnly cookie (used by cookie-based flows)

## Workspace isolation

Every mutating and listing operation is scoped by `workspaceId` from the JWT/header. Services join through `task → project → workspace` or direct `workspaceId` on entities.

Do not accept `workspaceId` from request body for authorization — use `req.user.workspaceId` from the guard.

## CORS

`FRONTEND_ORIGIN` must list exact frontend origins. The API enables credentials for cookie-based refresh.

## RBAC

Workspace roles (`ADMIN`, `MEMBER`) gate admin-only controllers. Additional checks in services prevent members from editing others’ time logs or accessing admin-only aggregates.

## Rate limiting

Not implemented in v1. Add at the reverse proxy or API gateway for production if needed.

## Export downloads

Export endpoints return binary streams with `Content-Disposition` attachment filenames. Filenames are sanitized in `packages/contracts/src/export-filename.ts` to prevent path injection.

## Reporting sensitive data

- Members do not receive workspace-wide revenue or other members’ hours in the client app by design.
- Admin exports can include email, rates, and amounts — restrict admin accounts accordingly.

## Incident response

1. Rotate `JWT_*_SECRET` (invalidates all sessions).
2. Review `FRONTEND_ORIGIN` for unexpected domains.
3. Audit workspace `ADMIN` memberships via `GET /workspaces/:id/members`.

See [AUTH.md](../architecture/AUTH.md) and [ENVIRONMENT.md](ENVIRONMENT.md).
