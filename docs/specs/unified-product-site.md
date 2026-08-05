# Unified product site

> **Status:** Shipped  
> **Program:** UPS-00–UPS-06  
> **Decision:** One customer product; isolated marketing and platform operations.

## Outcome

Kloqra ships one authenticated product from `apps/app` (`@kloqra/app`) on local port 3000. Every
customer persona uses auth scope `app`, one login, one workspace context, one shell, and one
personalized dashboard. `apps/web` remains public marketing and `apps/platform-admin` remains an
isolated internal console with scope `platform`.

## Capability-driven experience

All active workspace members receive Dashboard, Timer, Time Tracker, Timesheet, Submissions,
Projects, Tasks, Notifications, Profile, and personal Settings. Project managers receive actions
only for assigned projects. Workspace administrators receive authorized workspace operations.
Tenant owners/admins receive authorized organization controls under `/account/*`; tenant membership
does not imply workspace operational access.

There is no member/administrator mode switch. Shared resources use one route with permission-gated
actions. Hidden navigation and route groups are not authorization controls.

## Authorization contract

Permission identifiers live in `@kloqra/contracts`, describe domain actions rather than UI routes,
and keep resource scope separate. The API evaluates every protected request and denies by default.
Tenant isolation, subscription state, role scope, revocation, jobs, realtime handlers, exports, and
public API keys use the same policy model. Capability snapshots are presentation hints only.

Role grants are scope-limited, idempotent, concurrency-safe, audited, and unable to self-escalate.
Revocation invalidates relevant authorization state immediately.

## UI ownership

- `packages/ui` owns tokens, primitives, shell chrome, and reusable visual behavior.
- `packages/web-shared` owns shared providers, API/session hooks, stateful composites, and theme
  persistence.
- `apps/app` owns routes, data orchestration, capabilities, and feature composition.

## Acceptance criteria

- Cross-tenant, cross-workspace, cross-project, revoked-role, stale-session, and direct-request tests
  deny unauthorized access.
- Members cannot retrieve peer time, privileged aggregates, billing settings, or management exports.
- Product auth uses only scope `app`; platform auth remains isolated.
- Navigation/dashboard composition, accessibility, responsive behavior, Web Vitals, and bundle
  budgets pass.
- CI and deployment publish one customer product from `apps/app`.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass before release.

Operational guidance: [deployment](../runbooks/deploy.md), [authentication](../architecture/AUTH.md),
and [testing](../development/TESTING.md).
