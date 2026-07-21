---
name: harden-tenant-rbac
overview: Turn the current permission prototype into a fail-closed, versioned authorization system with one authoritative API path, safe role mutations, and migration coverage. Preserve current external behavior through explicit compatibility mapping while removing split-brain role checks incrementally.
todos:
  - id: contract-v2
    content: Create the canonical versioned action, policy, resource, capability, and role-mutation contracts with legacy mappings and tests.
    status: pending
  - id: authoritative-evaluator
    content: Implement the fail-closed decision engine plus authoritative fact-loading facade and exhaustive truth-table tests.
    status: pending
  - id: safe-role-mutations
    content: Centralize scoped grant/revoke orchestration with delegation rules, concurrency, idempotency, audit, and reliable invalidation.
    status: pending
  - id: migrate-enforcement
    content: Migrate controllers, services, workers, and realtime paths from role checks to action/resource authorization.
    status: pending
  - id: capability-snapshot
    content: Return scoped, versioned, short-lived UI capabilities without making them an API authority.
    status: pending
  - id: rbac-verification
    content: Complete negative integration/e2e coverage, architecture docs, task tracking, and pre-PR/security gates.
    status: pending
isProject: false
---

# Harden the Tenant RBAC Foundation

## 1. Normalize and version the contract
- Consolidate the duplicate role/action definitions in [`packages/contracts/src/tenant-rbac.ts`](/Users/chamal/Desktop/ChronoMint/packages/contracts/src/tenant-rbac.ts) and [`packages/contracts/src/permissions.ts`](/Users/chamal/Desktop/ChronoMint/packages/contracts/src/permissions.ts) into one SSOT exported from the package index.
- Use canonical, stable action IDs such as `timelog:create`, `timesheet:approve`, `project:manage`, `workspace:manage_members`, and `tenant:manage_billing`. Keep ownership and hierarchy in resource/condition data; avoid `:own` when `scope: self` already expresses it. Add a temporary legacy-name map for the current PascalCase identifiers rather than silently renaming them.
- Add `policyVersion`, typed managed-policy documents, immutable role IDs, allowed binding scopes, grantable-role rules, and discriminated resource references. Validate incompatible action/scope combinations and test identifier stability in [`packages/contracts/src/permissions.spec.ts`](/Users/chamal/Desktop/ChronoMint/packages/contracts/src/permissions.spec.ts).

## 2. Make evaluation fail closed and authoritative
- Split [`apps/api/src/common/access/authorization-policy.service.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/common/access/authorization-policy.service.ts) into a pure decision engine and an authorization facade that loads authoritative principal status, tenant/workspace/project ancestry, memberships, subscription state, and policy version inside the API. Feature callers should pass only `principal + action + resource + request context`, not trusted bindings or booleans.
- Make tenant isolation, account state, and subscription state required resolved facts. Evaluate in fixed order: malformed/unresolved context deny; tenant isolation deny; explicit system deny; account/subscription conditions; scoped managed-role allow; default deny. Return structured reason codes and matched policy metadata for audit/metrics without leaking sensitive details to clients.
- Replace the loose resource object with a discriminated union so contradictory `id`, `workspaceId`, and `projectId` combinations cannot be constructed. Add a policy decision truth table covering missing facts, resource ancestry, self ownership, inactive entities, multi-role union, explicit deny, and default deny.

## 3. Separate administration authority from operational access
- Encode role delegation as explicit actions and a role-grant matrix: tenant Owner/Admin may manage workspace-admin bindings within their tenant without acquiring workspace operational-data access; workspace admins may manage workspace members and project-manager bindings; project managers cannot mint peer managers; nobody may self-escalate.
- Correct [`apps/api/src/modules/workspace/application/workspace.service.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/modules/workspace/application/workspace.service.ts), where tenant-operator paths currently delegate to a workspace-membership authorization check. Keep tenant administration and workspace operations as separate decisions.
- Add invariants for last-owner/last-admin protection, target membership validity, active ancestor resources, and bounded role delegation.

## 4. Harden grant and revoke mutations
- Extend contract DTOs with required `reason`, an idempotency key, and an optimistic concurrency token/version. Back them with a durable mutation/idempotency record and constrained audit enums in [`apps/api/prisma/schema.prisma`](/Users/chamal/Desktop/ChronoMint/apps/api/prisma/schema.prisma); retain actor/target IDs after deletion, but also store tenant ID, policy version, prior/new role, request ID, and decision reason.
- Centralize grant/revoke orchestration so authorization, row locking or compare-and-swap, membership mutation, and audit insertion occur in one transaction. Cover role changes, activation/deactivation, removals, invites, tenant/platform role changes, denied attempts, failures, and idempotent no-ops—not only workspace/project promotions.
- Add database constraints or Prisma enums for every role source and index audit events by tenant plus `(scope, resourceId, createdAt)`. Record operation/status separately, actor type, request source, before/after binding state, and structured metadata.
- Treat session invalidation as part of successful security mutation delivery: use a transactional outbox plus a principal authorization epoch for revocation/cache invalidation and notifications so a post-commit Redis failure cannot leave stale access indefinitely. Ensure realtime connections revalidate or disconnect after revocation.
- Apply the same invalidation/version boundary to workspace deactivation/removal, tenant suspension, platform-staff demotion/deactivation/deletion, password resets, and impersonation authority. Guards and impersonation flows must reject stale role claims immediately.
- Make refresh rotation transactional and single-successor with a conditional update or row lock. Remove the signed-but-unknown refresh-token fallback after a time-bounded migration window so deleted or revoked token records cannot mint new sessions.

## 5. Migrate every enforcement path
- Inventory and replace the remaining `@Roles(...)`, `RolesGuard`, direct `role === ...`, service ownership checks, and tenant helper checks action-by-action. Keep temporary adapters only when they call the central facade and emit migration telemetry.
- Prioritize high-risk writes: billing/API keys, exports, member and role management, project/team mutations, approvals, imports, and reporting. Then migrate reads and personal actions.
- Reauthorize background work at execution time. In particular, stop trusting serialized `reviewerRole` in [`apps/api/src/modules/queues/workers/timesheet-bulk-review.worker.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/modules/queues/workers/timesheet-bulk-review.worker.ts). Apply the same model to websocket connection/subscription handling in [`apps/api/src/modules/notifications/interface/ws/notifications.gateway.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/modules/notifications/interface/ws/notifications.gateway.ts).
- Reauthorize or terminate long-lived WebSocket and SSE subscriptions after role removal, account suspension, workspace switching, or session revocation. Namespace rooms and Redis revocation keys by security domain (`product:user:*` versus `platform:user:*`); the current shared `user:*` room can collide when platform and product IDs match.
- Make invitation consumption atomic with a conditional `acceptedAt IS NULL` update or row lock, and route initial privileged grants from direct invites and bulk jobs through the same policy/audit command as later role changes.

## 6. Make capabilities scoped and short lived
- Replace the current flat role-union snapshot in auth sessions with a versioned capability response containing action plus resource scope/reference, `policyVersion`, `computedAt`, and a short expiry/ETag. A project-manager capability must retain its project boundary instead of becoming a global action string.
- Keep capabilities out of JWT claims and continue reevaluating every API call. Invalidate/refetch snapshots on workspace switches, role mutation events, account/subscription changes, and policy-version changes.

## 7. Verify, document, and roll out safely
- Add generated contract/evaluator truth tables over every role, action, legal scope, matching/mismatching resource anchor, active state, contextual deny, and multi-binding order. Assert exact managed-policy contents, duplicate-free statements, and intentionally unassigned actions.
- Add a focused `apps/api/test/authorization-rbac.e2e.ts` direct-request matrix plus role-revocation and socket E2E suites. Cover cross-tenant/workspace/project IDs, path/body/header disagreement, inactive memberships, old access and refresh tokens after demotion/removal, fresh reduced capabilities, concurrent grants, replayed idempotency keys, and last-admin protection. Require exact status/error codes and negative tests for every privileged endpoint.
- Add adversarial auth tests for concurrent refresh rotation, unknown/deleted refresh records, platform demotion, tenant suspension, stale impersonation authority, and concurrent invite consumption.
- Add worker tests for actors demoted or deactivated after enqueue, forged cross-scope payloads, revoked export requesters, and tenant-bound compliance jobs. Authorization must be reevaluated when work executes.
- Rewrite [`docs/architecture/TENANT_RBAC.md`](/Users/chamal/Desktop/ChronoMint/docs/architecture/TENANT_RBAC.md) around the canonical actions, policy versions, evaluation order, delegation matrix, audit semantics, and the invariant that tenant ownership does not imply workspace operational access. Update [`docs/architecture/AUTH.md`](/Users/chamal/Desktop/ChronoMint/docs/architecture/AUTH.md) for capability freshness and revocation behavior.
- Mark each documented control as implemented, partial, or target; replace inheritance-looking role diagrams with assignment-authority relationships, maintain an endpoint/action enforcement matrix, and correct stale `LEAD`/`ledProjectIds` terminology in `docs/specs/project-manager.md`.
- Reopen the prematurely completed `UPS-01`/`UPS-02` entries in [`TASK_BOARD.json`](/Users/chamal/Desktop/ChronoMint/TASK_BOARD.json), deliver in contract-first/TDD slices, run focused tests after each migrated domain, then execute the repository pre-PR gate and a focused security review.