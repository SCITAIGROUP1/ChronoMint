# QA testing guide

Kloqra has one customer-facing product at http://localhost:3000. Members, project managers,
workspace admins, and tenant owners/admins sign in at the same URL. Capabilities alter the visible
experience, while the API must deny unauthorized direct requests.

| Service              | Local URL                      |
| -------------------- | ------------------------------ |
| Product (`apps/app`) | http://localhost:3000          |
| API                  | http://localhost:3001          |
| API docs             | http://localhost:3001/api/docs |
| Platform admin       | http://localhost:3003          |

Start the API and product after bootstrap:

```bash
corepack pnpm serve:native # or serve:docker
corepack pnpm dev:api
corepack pnpm --filter @kloqra/app dev
```

Seed password: `password123`. Use `member@kloqra.dev` for personal workflows and
`admin@kloqra.dev` for workspace management. Use fixtures for project-manager and tenant roles.

## Persona checks

- **Member:** timer, timesheet, submissions, assigned projects/tasks, notifications, profile, and
  settings; no privileged workspace or account data.
- **Project manager:** management only for assigned projects; no workspace-wide billing or exports
  unless another role grants them.
- **Workspace admin:** projects, team, approvals, reports, exports, rates, and workspace settings.
- **Tenant owner/admin:** only authorized `/account/*` controls; no workspace operational data
  without workspace membership.

Test direct URLs and API requests as well as navigation visibility. Role changes must invalidate
older access tokens and force sign-in before new capabilities are used. Workspace switching must
not retain stale IDs. Product requests use `X-Auth-Scope: app`; platform sessions remain isolated.

## Automated checks

```bash
corepack pnpm test:coverage
corepack pnpm test:prepush
corepack pnpm test:dashboard
```

Sign-off records the environment, each customer persona, role-change revocation, direct-request
denials, platform isolation, blockers, tester, and date.

See [member getting started](../member/getting-started.md), [management getting started](../management/getting-started.md),
and the [release runbook](../../runbooks/unified-product-cutover.md).
