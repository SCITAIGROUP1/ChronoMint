---
name: unified-product-site
overview: "Deliver one capability-driven Kloqra customer product in apps/app, with app-only customer auth and isolated platform operations."
todos:
  - id: spec-contract
    content: Define unified personas, routes, capabilities, and acceptance criteria.
    status: completed
  - id: permission-foundation
    content: Add scoped permissions, managed-role policies, assignment rules, evaluation, and audit.
    status: completed
  - id: unify-auth
    content: Use the app scope for every customer product session.
    status: completed
  - id: unified-shell
    content: Build the capability-driven shell and personalized dashboard.
    status: completed
  - id: migrate-features
    content: Consolidate personal and management features in apps/app.
    status: completed
  - id: deploy-cutover
    content: Deploy one customer product from apps/app and document unified-only operation.
    status: completed
  - id: production-hardening
    content: Complete security, observability, performance, and deployment hardening.
    status: completed
  - id: uat-verify
    content: Complete role, workspace, security, and pre-PR regression verification.
    status: completed
isProject: false
---

# Unified Kloqra product site

> **Current state (July 2026):** This plan is complete. Kloqra has one customer product in
> `apps/app`, package `@kloqra/app`, local port `3000`, and customer auth scope `app`.
> `apps/platform-admin` remains an isolated internal console with scope `platform`.

## Product contract

- Every customer persona uses one login, workspace context, shell, and personalized dashboard.
- Capability-driven presentation never replaces API authorization.
- Personal, project, workspace, and organization modules remain distinct domain boundaries.
- `apps/web` remains the public marketing site.
- `apps/platform-admin` remains isolated from product sessions and customer navigation.

## Permission and session model

Permissions use stable contract identifiers and explicit resource scope. The API evaluates
`principal + action + resource + context`, applies tenant isolation and deny conditions first, and
records controlled role grants/revocations. Frontend capability snapshots are presentation hints.

Every customer request uses auth scope `app`. Platform requests use `platform`. Role changes
invalidate older access tokens so a fresh sign-in obtains current capabilities.

## Product composition

Every workspace member receives personal work routes. Project, workspace, and organization controls
appear only when effective capabilities permit them. Shared resources use one route and expose
authorized actions in context; there is no persona mode switch.

## Production acceptance

- Positive and negative authorization tests cover every managed role and resource boundary.
- Direct requests cannot bypass tenant, workspace, project, billing, export, or approval policy.
- Secure cookies, exact origins, CSRF/CORS protections, security headers, and session revocation are
  verified.
- Personal and management widgets remain independently lazy-loaded and meet bundle budgets.
- Staging and production deploy only `apps/app` as the customer product.
- The pre-PR gate and role-based UAT pass.

Canonical specification: [docs/specs/unified-product-site.md](docs/specs/unified-product-site.md).
