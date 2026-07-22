# Permission Studio

**Status:** research closure; no runtime implementation is authorized by this document  
**Baseline:** `POLICY_VERSION = "v1"` in `packages/contracts/src/permissions.ts`  
**Companion inventory:** [permission-studio-authorization-inventory.md](permission-studio-authorization-inventory.md)

## Purpose and authority

Permission Studio will present and mutate tenant-scoped authorization policy only after persistence,
evaluation, audit, and invalidation are deployed as one authoritative path. Until then, the existing
editor is a prototype: its process-local overrides are not authorization evidence.

Authority order:

1. Contracts define IDs, metadata, legal scopes, managed-role defaults, DTOs, and routes.
2. The API resolves trusted resource ancestry and active role bindings.
3. One policy evaluator produces the decision; UI capabilities are presentation hints only.
4. Persisted policy overrides and an append-only policy audit are the only customization authority.

## Threat model

### Protected assets

- Tenant, workspace, project, time, billing, export, API-key, integration, and support data.
- Role templates, principal overrides, audit history, policy revisions, and capability snapshots.
- High-impact operations: staff/role grants, billing, imports/exports/downloads, API keys, support
  access, session/MFA controls, queue operations, tenant suspension/deletion, and GDPR actions.

### Adversaries and failure modes

- A member, project manager, tenant admin, support user, or compromised session escalating itself.
- A valid user changing a locator to cross tenant, workspace, project, member, job, or share scope.
- A revoked/demoted actor whose queued job, WebSocket, cache, or capability snapshot remains active.
- Forged/replayed webhook, API key, share token, invite token, or idempotency key.
- Concurrent admins overwriting policy, partial batch writes, or audit writes surviving without policy.
- Mixed-version processes interpreting renamed permissions or missing override data as an allow.
- UI false success, stale effective-access explanations, or presentation code becoming enforcement.

### Trust boundaries

- Browser and request path/body/query values are untrusted.
- JWTs establish identity/session scope, not current authorization.
- API keys and share/invite tokens are bounded delegated credentials, never general user roles.
- Queue payloads are untrusted stale claims; actor and resource authorization is re-resolved at run time.
- Redis/cache/capability snapshots improve delivery only; PostgreSQL policy and memberships remain
  authoritative.
- External webhooks require provider signature, timestamp/replay, and idempotency verification.

## Security invariants

1. Fail closed on missing permission metadata, resource ancestry, binding, policy data, or revision.
2. Resolve tenant/workspace/project ancestry from persisted records; never authorize from a body ID.
3. No cross-tenant or cross-resource access, including job status/downloads and public credentials.
4. No self-escalation, self-demotion bypass, or grant at/above the actor's delegation boundary.
5. `TENANT_OWNER` and all platform policy templates are immutable in the tenant studio.
6. Tenant ownership does not imply workspace access; a separate active workspace binding is required.
7. Inactive/revoked users, memberships, credentials, tokens, shares, and role bindings never grant.
8. Account, subscription, feature, legal-hold, and structural denials cannot be overridden.
9. At a matching resource: structural/system deny, principal deny, principal allow, tenant role
   override, canonical role union, default deny. A principal deny wins over every role allow.
10. A role-level deny modifies only that role; another applicable role may still allow.
11. Personal permissions require the resource owner to equal the principal.
12. Every protected operation has exactly one primary canonical permission and trusted resolver.
13. Workers reauthorize immediately before side effects; serialized roles/capabilities are ignored.
14. Policy mutation is transactional with revision increment, idempotency, and append-only audit.
15. A stale cached allow cannot survive a membership/policy revision change.
16. Capability snapshots are scoped, short-lived, revisioned, and never accepted by the API as proof.
17. Aliases can preserve compatibility but can never broaden scope, role defaults, or effect.
18. Audit/UI copy must not claim tamper evidence until deterministic chaining and verification exist.

## Exact v1 baseline role matrix

This table is an exact transcription of the 46 `PERMISSIONS` and seven
`MANAGED_ROLE_POLICIES` on the audit date. `Y` means the role has an allow statement; `—` means it
does not. Workspace-admin project statements are at **workspace** scope; project-manager statements
are at **project** scope. A project manager normally also needs a workspace-member binding for
personal/workspace access; the `PM` column alone does not imply that binding.

| Permission                     | PSA | PS  | TO  | TA  | WA  | WM  | PM  |
| ------------------------------ | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `platform:AccessConsole`       |  Y  |  Y  |  —  |  —  |  —  |  —  |  —  |
| `platform:ListTenants`         |  Y  |  Y  |  —  |  —  |  —  |  —  |  —  |
| `platform:ManageTenants`       |  Y  |  —  |  —  |  —  |  —  |  —  |  —  |
| `platform:ReadAuditLog`        |  Y  |  Y  |  —  |  —  |  —  |  —  |  —  |
| `tenant:Access`                |  —  |  —  |  Y  |  Y  |  —  |  —  |  —  |
| `tenant:ReadOrganization`      |  —  |  —  |  Y  |  Y  |  —  |  —  |  —  |
| `tenant:UpdateOrganization`    |  —  |  —  |  Y  |  Y  |  —  |  —  |  —  |
| `tenant:ReadAnalytics`         |  —  |  —  |  Y  |  —  |  —  |  —  |  —  |
| `tenant:ListWorkspaces`        |  —  |  —  |  Y  |  Y  |  —  |  —  |  —  |
| `tenant:CreateWorkspace`       |  —  |  —  |  Y  |  Y  |  —  |  —  |  —  |
| `tenant:ManageWorkspaceAdmins` |  —  |  —  |  Y  |  Y  |  —  |  —  |  —  |
| `tenant:ListMembers`           |  —  |  —  |  Y  |  —  |  —  |  —  |  —  |
| `tenant:ManageMembers`         |  —  |  —  |  Y  |  —  |  —  |  —  |  —  |
| `tenant:ReadBilling`           |  —  |  —  |  Y  |  —  |  —  |  —  |  —  |
| `tenant:ManageBilling`         |  —  |  —  |  Y  |  —  |  —  |  —  |  —  |
| `tenant:ExportData`            |  —  |  —  |  Y  |  —  |  —  |  —  |  —  |
| `workspace:Access`             |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |
| `workspace:ReadSettings`       |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:UpdateSettings`     |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:ListMembers`        |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:ManageMembers`      |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:ListProjects`       |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |
| `workspace:CreateProject`      |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:UpdateProject`      |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:DeleteProject`      |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:ManageCategories`   |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:ReadReports`        |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:CreateExport`       |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:ManageBillingRates` |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:ManageApiKeys`      |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `workspace:ReadPresence`       |  —  |  —  |  —  |  —  |  Y  |  —  |  —  |
| `project:Read`                 |  —  |  —  |  —  |  —  |  Y  |  —  |  Y  |
| `project:Update`               |  —  |  —  |  —  |  —  |  Y  |  —  |  Y  |
| `project:ManageTasks`          |  —  |  —  |  —  |  —  |  Y  |  —  |  Y  |
| `project:ListTeam`             |  —  |  —  |  —  |  —  |  Y  |  —  |  Y  |
| `project:ManageTeam`           |  —  |  —  |  —  |  —  |  Y  |  —  |  Y  |
| `project:ReviewTimesheets`     |  —  |  —  |  —  |  —  |  Y  |  —  |  Y  |
| `project:ReadReports`          |  —  |  —  |  —  |  —  |  Y  |  —  |  Y  |
| `project:ReadPresence`         |  —  |  —  |  —  |  —  |  Y  |  —  |  Y  |
| `personal:ManageTimer`         |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |
| `personal:ManageTimelogs`      |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |
| `personal:SubmitTimesheets`    |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |
| `personal:ListProjects`        |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |
| `personal:ReadNotifications`   |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |
| `personal:ManageProfile`       |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |
| `personal:CreateExport`        |  —  |  —  |  —  |  —  |  Y  |  Y  |  —  |

Baseline allow counts: PSA 4, PS 3, TO 12, TA 6, WA 30, WM 9, PM 8.

## Verified contract/runtime mismatches

| Finding                          | Contract/documented expectation                                           | Runtime evidence and consequence                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evaluator coverage               | All decisions flow through `AuthorizationPolicyService`                   | Only role-grant/project-access services call it, using three unique permissions. Controllers use coarse guards.                                                                            |
| Permission editor authority      | Changes represent effective policy                                        | Two module-level `Map`s store role/member booleans. They are process-local, unscoped beyond tenant/member keys, lost on restart, and never read by the evaluator/session.                  |
| Owner policy immutability        | Tenant Owner cannot be customized                                         | Service lets an owner modify `TENANT_OWNER`; only non-owner admins are blocked.                                                                                                            |
| Platform policy/use              | Support has list-tenants and audit permissions                            | Platform tenant/audit controllers require `PlatformSuperadminGuard`, excluding support despite v1 defaults.                                                                                |
| Tenant member visibility         | v1 gives `tenant:ListMembers` only to owner                               | `GET /tenants/current/members` allows OWNER and ADMIN. Either default or route is wrong; no permission check resolves it.                                                                  |
| Workspace membership             | Owners/admins need explicit workspace binding for operations              | Tenant-operator service paths can manage workspace members by tenant role; these must remain explicit delegated account actions, not implied workspace access.                             |
| PM task/report/presence/approval | Distinct `ManageTasks`, `ReadReports`, `ReadPresence`, `ReviewTimesheets` | `AdminOrProjectManagerGuard` is reused across all four; it is not permission-aware.                                                                                                        |
| Workspace creation               | `tenant:CreateWorkspace` for TO/TA                                        | `/workspaces` is mounted under workspace guards without a stable path workspace context; tenant-scoped `/tenants/current/workspaces` is the coherent route.                                |
| Timelog import                   | No v1 import permission                                                   | Authenticated workspace roles can reach import/template without an ADMIN decorator; target should be a high-risk workspace import permission.                                              |
| Worker authorization             | Reauthorize at execution                                                  | Timesheet worker refreshes membership only. Bulk invite/category and export workers do not evaluate the originating actor's current permission; bulk category has no actor ID.             |
| Realtime                         | Scoped rooms and active authorization                                     | Rooms are identity-separated, but product sockets do not recheck current membership/permission; every valid platform principal can join the shared helpdesk room.                          |
| Public inbound email             | Authenticated external integration                                        | `/helpdesk/email-inbound` accepts a generic body without visible provider signature/replay verification.                                                                                   |
| No impersonation                 | Platform superadmin cannot impersonate users                              | Auth controller exposes start/complete/stop impersonation routes. This requires removal or an explicit policy decision before cataloging.                                                  |
| Catalog metadata                 | One canonical metadata source with explicit scope/applicability/lifecycle | Metadata derives parent/action fields heuristically, mixes upper/lower action types, has only five broad categories, and omits customization/applicable-role/lifecycle/enforcement fields. |
| Capability snapshot              | Scoped, expiring, ETagged UI hint                                         | Contract type exists, but auth/UI still have flat/partial capability usage; overrides cannot invalidate snapshots.                                                                         |
| Tamper evidence                  | Product copy must match guarantee                                         | Role-grant audit records events, but no deterministic hash chain/verification was found for permission-policy audit.                                                                       |
| Routes SSOT                      | Controllers use `ROUTES`                                                  | Helpdesk and platform staff controllers contain hard-coded paths; two helpdesk REST controllers are empty placeholders.                                                                    |

## Before/after permission change proposal

This is a proposal for the contract task, not an implemented catalog. Existing IDs remain stable unless
listed as split/deprecated. New defaults are deliberately conservative.

### Retain unchanged

Retain all 46 v1 IDs for compatibility during rollout. Their exact defaults remain the matrix above
until endpoint coverage and migration tests approve an intentional change. Do not silently broaden
tenant admin or support.

### Add and split

| Proposed v2 ID                        | Change from v1                      | Primary affected surfaces               | Proposed defaults                             |
| ------------------------------------- | ----------------------------------- | --------------------------------------- | --------------------------------------------- |
| `platform:ReadOperations`             | new                                 | ops summary                             | PSA, PS                                       |
| `platform:ReadSubscriptions`          | new                                 | subscription lists/detail/events        | PSA, PS                                       |
| `platform:ReadPlanCatalog`            | new                                 | plans/catalog reads                     | PSA, PS                                       |
| `platform:ManagePlanCatalog`          | split from broad tenant management  | plan/catalog writes                     | PSA                                           |
| `platform:ReadQueues`                 | new                                 | failed-job listing                      | PSA                                           |
| `platform:ManageQueues`               | new                                 | retry/pause/resume                      | PSA                                           |
| `platform:ManageSalesInquiries`       | new                                 | tenant inquiry/receipt platform actions | PSA; PS only after explicit delegation        |
| `platform:ManageTenantLimits`         | split from `platform:ManageTenants` | limits, grace period, trial extension   | PSA                                           |
| `platform:ManageTenantSecurity`       | split from `platform:ManageTenants` | revoke sessions, reset MFA              | PSA                                           |
| `platform:ExportTenantData`           | new                                 | platform GDPR export                    | PSA                                           |
| `platform:DeleteTenantData`           | new                                 | platform GDPR delete                    | PSA                                           |
| `platform:ManageStaff`                | new                                 | platform staff CRUD                     | PSA                                           |
| `platform:ReadSupportTickets`         | new                                 | helpdesk list/detail/socket             | PSA, PS                                       |
| `platform:ManageSupportTickets`       | new                                 | ticket update/reply                     | PSA, PS                                       |
| `platform:ReadSupportMetrics`         | new                                 | future helpdesk stats                   | PSA, PS                                       |
| `platform:ManageSupportQueues`        | new                                 | future helpdesk queues                  | PSA                                           |
| `platform:ReadOwnNotifications`       | new                                 | platform notifications/socket           | PSA, PS                                       |
| `platform:ManageOwnProfile`           | new                                 | platform profile/layout                 | PSA, PS, self                                 |
| `platform:ManageOwnSecurity`          | new                                 | platform password/sessions/MFA          | PSA, PS, self                                 |
| `tenant:ReadPermissionPolicy`         | new                                 | matrix/member policy reads              | TO; delegated TA                              |
| `tenant:ManagePermissionPolicy`       | new                                 | role/principal policy mutations         | TO for lower roles; constrained TA delegation |
| `tenant:ReadPermissionAudit`          | new                                 | role/policy audit                       | TO; safe delegated TA view                    |
| `tenant:ImportData`                   | split from no ID                    | tenant import endpoints/worker          | TO                                            |
| `tenant:ManageSalesInquiry`           | split from `tenant:ManageBilling`   | inquiry/receipt submission              | TO                                            |
| `workspace:ListCategories`            | split read from manage              | category listing                        | WA, WM                                        |
| `workspace:ImportTimelogs`            | new                                 | timelog template/import                 | WA                                            |
| `workspace:ReadTimelogAudit`          | new                                 | workspace timelog audit                 | WA                                            |
| `workspace:ReviewTimesheets`          | new workspace-wide counterpart      | missing/remind and workspace approvals  | WA                                            |
| `workspace:ManageIntegrations`        | new                                 | workspace Jira/integration verification | WA                                            |
| `workspace:ManageReportShares`        | new                                 | widget shares                           | WA                                            |
| `workspace:CreateInvoiceExport`       | split from `workspace:CreateExport` | invoice generation                      | WA                                            |
| `workspace:DownloadExports`           | split data retrieval                | admin job downloads                     | WA                                            |
| `workspace:ManageExportConfiguration` | new                                 | presets/schedules                       | WA                                            |
| `workspace:ManageExportShares`        | new                                 | public export links                     | WA                                            |
| `personal:ManageAccountSecurity`      | split from profile                  | password/sessions/MFA/phone             | all authenticated principals, self            |
| `personal:ManageIntegrations`         | new                                 | personal Jira credentials/verification  | active product principals, self               |
| `personal:UseAssistant`               | new                                 | assistant chat                          | active product principals allowed by plan     |
| `personal:ManageNotifications`        | split writes from read              | mark read/all                           | active product principals, self               |
| `personal:ReadReports`                | optional clarity split              | `/reporting/me`                         | WA, WM through own workspace binding          |

### Rename/deprecate decisions

- No deployed canonical ID is renamed in the first v2 release.
- Keep `workspace:CreateExport` for generate/preview during the compatibility window; narrower new IDs
  govern invoice, downloads, configuration, and shares.
- Keep `tenant:ManageBilling` for subscription/checkout/portal; sales inquiry migrates to its narrower ID.
- Keep `personal:ManageProfile` for profile/preferences/layout; account security migrates to its narrower ID.
- The `LEGACY_PERMISSION_MAP` PascalCase names remain telemetry-only and are never accepted by the
  evaluator.
- `platform:ImpersonateTenantUser` is intentionally **not approved**. Existing routes must be reconciled
  with the documented no-impersonation policy before a contract ID can exist.
- Public token/webhook/system authorities are credential types, not customizable managed-role
  permissions. Presentation-only labels must not enter role policies.

## Migration and mixed-version compatibility

1. Publish v2 metadata and DTO support additively; bump `POLICY_VERSION` only with exact checksum tests.
2. Persist policy statements by canonical ID, effect, target, scope, resource, and revision. Unknown IDs
   fail closed and are retained for rollback diagnostics, never interpreted as allow.
3. Seed no custom override rows. Absence means `INHERIT`, preserving the exact v1 defaults.
4. For a split permission, shadow-evaluate old and new decisions. During a bounded compatibility
   window, the old allow may satisfy the new action only where the migration map names that exact
   endpoint and scope. It must never authorize a wider resource or role.
5. Dual-read is revisioned and deny-safe: explicit new deny wins; missing/corrupt policy data denies;
   no fallback-to-allow.
6. Old writers are disabled before authoritative overrides are enabled. Mixed presentation-only and
   authoritative writes are forbidden.
7. Capability payloads carry policy version, revision/ETag, resource IDs, computed/expiry timestamps.
   Old clients may ignore new fields; APIs never trust either payload version for authorization.
8. Backfill jobs and queued work deserialize legacy role fields but re-resolve the actor, active
   bindings, resource ancestry, and canonical permission at execution.
9. Preserve old IDs and audit display through at least one supported app/API deployment window.
   Alias removal gets an explicit task/date after telemetry shows no old caller.
10. Rollback disables custom override reads and returns to the versioned canonical v1 snapshot without
    dropping override/audit rows. Forward/rollback and multi-replica behavior must be staging-tested.

## UI architecture boundaries

- `packages/contracts`: permission IDs, metadata, defaults, scope/applicability, tri-state/effective
  DTOs, batch routes, errors, revisions, pagination, and capability snapshots.
- `apps/api`: trusted resource resolvers, bindings, evaluator, persistence, transactional mutations,
  audit, revision invalidation, and safe decision explanations.
- `packages/ui`: reusable tri-state control, effective/source/risk badges, review/confirmation
  primitives, responsive master-detail behavior, accessibility and focus behavior.
- `packages/web-shared`: typed API/session/list hooks, query keys, capability helpers, optimistic
  conflict handling, and invalidation. It never decides authorization.
- `apps/app`: thin route wrapper, Permission Studio composition, URL-addressed selection, draft/review
  workflow, and small typed local draft state. It does not redefine contracts, paths, permission copy,
  or transport.
- Platform templates and `TENANT_OWNER` appear read-only. Tenant admins see only delegated actions.
- Existing simulated toggle success must be disabled until persistence and enforcement are deployed
  together.

## Acceptance gates

Research closure is complete when:

- [x] Every discovered HTTP method, worker, schedule, WebSocket, public/API-key path, integration,
      export/download, and support/platform action is inventoried with current and intended policy.
- [x] The exact 46-permission/seven-role v1 matrix is recorded.
- [x] Threats, invariants, mismatches, before/after proposal, compatibility, and UI boundaries are explicit.
- [ ] Product/security owners resolve no-impersonation versus existing routes.
- [ ] Product/security owners approve tenant-admin member visibility and permission delegation.
- [ ] Contract task assigns final IDs/scopes/defaults and a policy checksum/version.

Implementation/release gates:

- [ ] Every protected operation has one manifest entry, canonical permission, trusted resolver, and
      positive/negative tests; every catalog permission has enforcement or explicit presentation-only status.
- [ ] Owner/platform immutability, no self-escalation, tenant isolation, inactive membership, deny
      precedence, and subscription/system denial have property and E2E coverage.
- [ ] Policy writes are transactional, idempotent, optimistic-concurrency safe, append-only audited,
      restart-safe, and multi-replica safe.
- [ ] Workers, WebSockets, API keys, shares, integrations, imports/exports/downloads, and support paths
      pass revocation and cross-scope attack tests.
- [ ] UI passes keyboard, screen-reader, focus restoration, 44px target, reduced motion, contrast,
      zoom/reflow, stale/conflict, permission-loss, and draft recovery tests.
- [ ] Migration tests prove representative existing users retain valid access unless an intentional
      matrix change is listed and approved.
- [ ] Shadow comparison has no unexplained allow/deny mismatch; alerts cover evaluator errors,
      cross-tenant mismatch, stale revision, deny spikes, and audit failure.
- [ ] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` and the complete
      authorization E2E matrix pass before release.

`UPS-01` and `UPS-02` remain in progress until their implementation and full verification gates pass.
