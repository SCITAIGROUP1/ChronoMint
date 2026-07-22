# Unified product release runbook

The unified product topology is the only supported topology: `apps/app`, package `@kloqra/app`,
local port `3000`, and product auth scope `app`. `apps/platform-admin` remains isolated under scope
`platform`.

## Required configuration

- `VERCEL_APP_PROJECT` identifies the product project.
- `APP_URL` is the canonical product URL.
- `NEXT_PUBLIC_AUTH_SCOPE=app` is configured on `apps/app`.
- API `PUBLIC_APP_URL` resolves to `APP_URL`.
- The role-grant audit migration is deployed before the product release.

## Release gates

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Require policy-evaluator and role-grant tests, all customer-persona UAT, direct-link authorization
checks, session-revocation checks after role changes, browser-security headers, CORS/CSRF checks,
bundle budgets, and post-deploy smoke checks.

## Release

1. Apply migrations and deploy the API.
2. Confirm API health and refresh with `X-Auth-Scope: app`.
3. Deploy `apps/app` to `VERCEL_APP_PROJECT`.
4. Run persona smoke tests against `APP_URL`.
5. Verify monitoring for authentication failures, authorization denials, API errors/latency,
   client-side route errors, dynamic imports, and WebSocket disconnects.

Do not log access tokens, refresh cookies, invitation tokens, secrets, or full personal time-entry
descriptions.

If the release is unhealthy, revert the product to its previous `apps/app` Vercel deployment while
keeping compatible API and additive schema changes. Record the incident and affected personas.
