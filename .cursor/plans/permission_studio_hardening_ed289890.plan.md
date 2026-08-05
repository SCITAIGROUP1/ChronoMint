---
name: Permission Studio Hardening
overview: Replace the prototype permission matrix with a complete, persistent, scoped authorization system. Audit and version every default permission, enforce role/member overrides across the API, and deliver a clear tri-state studio while keeping platform and Tenant Owner policies immutable.
todos:
  - id: close-research
    content: Produce and sign off the exhaustive operation-to-permission inventory, threat model, default-role matrix, and migration compatibility report before implementation.
    status: completed
  - id: catalog-contracts
    content: Audit the full product surface; finalize and version the canonical permission catalog, metadata, role defaults, and tri-state contracts with exact tests.
    status: completed
  - id: persistence-audit
    content: Add normalized scoped override and permission-audit persistence with migration, isolation, concurrency, and transaction tests.
    status: completed
  - id: authorization-enforcement
    content: Integrate override precedence into the evaluator and migrate every protected operation from coarse role checks to canonical permission enforcement.
    status: completed
  - id: studio-api-capabilities
    content: Rebuild role/member policy APIs and emit scoped, versioned capability snapshots with invalidation.
    status: completed
  - id: studio-ux
    content: Deliver a modern, responsive, accessible role-template/member studio using centralized contracts, @kloqra/ui primitives, and @kloqra/web-shared data/state patterns.
    status: completed
  - id: verification-docs
    content: Add exhaustive API/UI/E2E coverage, enforcement completeness checks, documentation, task-board updates, and run the full quality gate.
    status: completed
  - id: rollout-observability
    content: Ship additive migrations and staged enforcement with policy-revision invalidation, decision telemetry, rollback checks, and post-deploy smoke tests.
    status: completed
isProject: false
---

# Production Permission Studio

## Verified baseline
- The catalog currently has 46 permissions and seven managed roles, but only three permission IDs reach the central evaluator; the rest rely on coarse role guards.
- Role/member overrides in [`permission-matrix.service.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/modules/tenants/application/permission-matrix.service.ts) are process-local, unscoped, and do not affect authorization or session capabilities.
- Keep platform policies and `TENANT_OWNER` immutable. Allow tenant-specific templates for `TENANT_ADMIN`, `WORKSPACE_ADMIN`, `WORKSPACE_MEMBER`, and `PROJECT_MANAGER`, plus resource-scoped principal overrides.

## Non-negotiable architecture boundaries
- Preserve contract-first delivery: permission IDs, scopes, role applicability, metadata, effects, DTOs, routes, errors, pagination, and capability snapshots are defined once in `@kloqra/contracts` before API or UI implementation. Apps must not redefine shapes, infer permission meaning from names, or hardcode API paths.
- Keep policy decisions centralized in the API access layer. Controllers/services consume one evaluator and one binding/policy resolver; no new direct role-string checks or feature-local authorization logic.
- Keep reusable visual primitives and behavior in `@kloqra/ui`, shared API/session/list hooks in `@kloqra/web-shared`, and only page orchestration/draft workflow in `apps/app`. Remove the app-local switch/permission implementations rather than creating parallel components.
- Derive API validation, studio labels/groups/risk, role defaults, audit display, and enforcement coverage from the same canonical contract metadata. Any unavoidable display-only copy must reference a permission ID and be tested against the catalog.
- Follow the existing thin `app/.../page.tsx` wrapper, `features/...` client page, `api()`/`ROUTES`, `AppBar`, `DataTableCard`, `ConfirmDialog`, loading, error, toast, and design-token conventions documented in [`FRONTEND-UI.md`](/Users/chamal/Desktop/ChronoMint/docs/development/FRONTEND-UI.md).

## 1. Close every research and policy gap first
- Create a checked-in authorization inventory covering every HTTP method/route, worker, scheduled job, queue consumer, WebSocket event, export/download, public/API-key path, integration, and support/platform action. Record its current guard, resource resolver, tenant boundary, intended permission, risk, and expected default roles.
- Reconcile that inventory against [`routes.ts`](/Users/chamal/Desktop/ChronoMint/packages/contracts/src/routes.ts), all controller modules, [`TENANT_RBAC.md`](/Users/chamal/Desktop/ChronoMint/docs/architecture/TENANT_RBAC.md), platform/project-manager specs, and actual frontend capability use. Resolve every documented-versus-runtime disagreement before changing defaults.
- Write the security invariants explicitly: fail closed; no cross-tenant/resource access; no self-escalation; no owner/platform policy mutation; tenant ownership never implies workspace access; inactive/revoked memberships never grant; subscription/system denies cannot be overridden; principal deny wins at the matching resource.
- Produce an exact before/after role matrix and permission change report, including renamed/split/new/deprecated IDs and affected endpoints. Treat catalog changes as versioned contract changes with a compatibility window, not silent edits.
- Do not expose the existing editor as functional during implementation: remove/disable false-success controls until persistence and enforcement are deployed together.

## 2. Lock down the canonical catalog and defaults
- Reconcile every protected HTTP route, worker, realtime action, export, integration, and account operation against [`permissions.ts`](/Users/chamal/Desktop/ChronoMint/packages/contracts/src/permissions.ts) and the product contracts in [`TENANT_RBAC.md`](/Users/chamal/Desktop/ChronoMint/docs/architecture/TENANT_RBAC.md).
- Add missing high-confidence actions, including policy administration/audit, tenant import, granular platform operations, and materially distinct export/timesheet/integration actions; remove ambiguity where one permission currently controls unrelated operations.
- Give each permission explicit scope, action dimension, risk, parent group, customization rules, applicable target roles, enforcement surface, and lifecycle status. Platform permissions remain enforceable but cannot be customized from the tenant studio.
- Define exact role-policy snapshots and bump `POLICY_VERSION` whenever policy content changes. Add temporary aliases only where a deployed client/API compatibility need is proven; aliases must never broaden authorization.
- Extend [`permissions.spec.ts`](/Users/chamal/Desktop/ChronoMint/packages/contracts/src/permissions.spec.ts) to assert exact catalog/defaults, metadata completeness, scope compatibility, no orphan permissions, delegation rules, and a policy checksum/version gate.

## 3. Define scoped tri-state contracts and persistence
- Redesign [`permission-matrix.dto.ts`](/Users/chamal/Desktop/ChronoMint/packages/contracts/src/dto/permission-matrix.dto.ts) around `INHERIT | ALLOW | DENY`, configured versus effective state, source/reason, target role or principal, resource scope/ID, optimistic version, and idempotency key. Keep invalid permission/scope/role combinations unrepresentable.
- Add normalized Prisma models and an additive migration in [`schema.prisma`](/Users/chamal/Desktop/ChronoMint/apps/api/prisma/schema.prisma): tenant role overrides, principal overrides, tenant policy revision, idempotency records, and dedicated permission-policy audit events with unique scoped keys and before/after values. `INHERIT` deletes the override row.
- Index hot lookups by tenant, principal/role, scope, resource, permission, and revision. Use database constraints for legal effects and uniqueness, and preserve audit rows when users/resources are removed.
- Enforce transactional writes, tenant isolation, stale-write conflicts, idempotent replay, and audit rollback. Never use `Tenant.settings`, process memory, JWT claims, or role-grant audit rows as the authorization authority.
- Make policy audit append-only and tamper-evident with deterministic event hashes/chain verification, or remove all “tamper-evident” product copy until that guarantee is implemented and tested.

## 4. Make authorization authoritative everywhere
- Extend [`authorization-policy.service.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/common/access/authorization-policy.service.ts) and [`managed-role-bindings.service.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/common/access/managed-role-bindings.service.ts) to resolve persisted scoped policy state.
- Apply precedence: structural/system denial; matching principal deny; matching principal allow; tenant role override per applicable role; canonical role union; default deny. A role-level deny modifies only that role, while a principal deny overrides the role union at that resource.
- Introduce reusable permission metadata/guards for simple routes and service-level assertions for record-resolved resources. Replace coarse authorization across platform, tenants, workspaces, projects/tasks, timesheets, reports, exports, billing, presence, profile, notifications, integrations, workers, and realtime handlers.
- Correct existing misbindings where `project:ManageTeam` currently stands in for task, timesheet, and reporting permissions. Enforce account status, subscription state, tenant isolation, and resource anchoring on every decision.
- Add a coverage test/manifest proving every protected operation has exactly one canonical permission and every catalog permission has an enforcement or explicitly documented presentation-only use.
- Keep evaluation data-driven and testable: resolve bindings/overrides before the pure decision function, batch request lookups, and use only conservative revision-keyed caching. Policy mutation/revocation must invalidate immediately; a stale cached allow must never survive a revision change.

## 5. Rebuild the studio API and capability snapshots
- Rewrite [`permission-matrix.service.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/modules/tenants/application/permission-matrix.service.ts) and tenant controller endpoints to serve separate role-template and principal-override views, scoped directories/bindings, per-row inheritance, selective reset, and reset-all.
- Authorize policy administration itself: owners manage lower-role templates; tenant admins may only manage delegated member permissions and cannot alter owner, platform, billing/export, or policy-administration boundaries.
- Replace flat session hints in [`auth.dto.ts`](/Users/chamal/Desktop/ChronoMint/packages/contracts/src/dto/auth.dto.ts) and [`auth.service.ts`](/Users/chamal/Desktop/ChronoMint/apps/api/src/modules/auth/application/auth.service.ts) with scoped capability snapshots carrying policy version, resource IDs, expiry, and ETag. Invalidate/refetch affected state immediately after policy changes; API evaluation remains authoritative.
- Return stable pagination/filtering for large member/resource directories, effective-decision explanations safe for administrators, and conflict responses that let the UI reload without losing unrelated edits.
- Support draft-oriented batch mutations in the contract/API so the UI can review and atomically save a coherent change set. Return field-level validation/conflict results keyed by permission ID; never require dozens of independent toggle requests.

## 6. Replace the confusing UI with one truthful editor
- Rebuild [`permissions-studio-page.tsx`](/Users/chamal/Desktop/ChronoMint/apps/app/src/features/account/permission-matrix/permissions-studio-page.tsx) as an enterprise master-detail workspace:
  - `AppBar` with policy version/status and a centralized `SegmentedControl` for “Role templates” versus “Member overrides”.
  - URL-addressable scope/resource/role/member selection so refresh, back/forward, and deep links preserve context.
  - Desktop searchable directory plus detail pane; compact screens use the same directory in an accessible drawer and a single-column editor.
  - Sticky context header showing selected role/member, resource scope, inherited role, override count, last policy update, and immutable status.
- Replace the sparse action-dimension matrix with progressive disclosure:
  - Search plus contract-driven filters for domain, scope, effective state, override state, and risk.
  - Collapsible permission groups with allowed/denied/overridden counts and “expand changed only”.
  - Each row shows label, plain-language description, canonical ID, scope/risk badges, effective result, source, and a centralized three-state `Inherited | Allow | Deny` control.
  - A “Why?” details panel explains the winning role/override and higher-priority system restrictions without exposing sensitive internals.
- Use a deliberate draft/review/save interaction rather than immediate destructive toggles. Maintain a visible changed-count bar, undo per row, discard all, and “Review changes” drawer summarizing before/after decisions and affected scope. Save the batch atomically with optimistic versioning.
- Require `ConfirmDialog` plus a reason for high-risk grants/denies, bulk changes, and reset-all. Clearly distinguish reversible inheritance reset from destructive denial and never rely on color alone.
- Show pending, empty, stale, conflict, partial-load, and permission-loss states inline. Preserve user drafts across a recoverable refetch, block navigation with unsaved changes, and offer reload/compare on version conflict.
- Remove the simulated success path in [`permission-toggle-dialog.tsx`](/Users/chamal/Desktop/ChronoMint/apps/app/src/components/permission-toggle-dialog.tsx); organization/workspace member actions will deep-link to or reuse the authoritative studio.
- Add the reusable tri-state control, review drawer primitives, status badges, and responsive master-detail behavior to `@kloqra/ui` only when an existing primitive cannot compose the experience; each new primitive ships with sibling tests and design-token-only styling.
- Put shared permission-query/mutation hooks, cache invalidation, and scoped capability helpers in `@kloqra/web-shared`; keep feature draft state in a small typed Zustand store when it spans panes/drawers. `apps/app` owns composition, not transport or contract duplication.
- Meet WCAG 2.2 AA: complete keyboard operation, roving/focus management, screen-reader announcements for effective/configured changes, 44px touch targets, reduced-motion support, contrast, zoom/reflow, and deterministic focus restoration after dialogs/drawers.
- Correct audit-page claims unless tamper evidence is actually implemented. Use concise copy that says “Organization”, “Role default”, “Member override”, and “Effective access” consistently rather than mixing tenant, endpoint capability, and permission-matrix terminology.

## 7. Prove persistence, enforcement, and safe defaults
- Add contract DTO tests, Prisma schema/migration tests, property-based evaluator truth tables, service/controller tests, and API E2E coverage for inherit → allow → deny → inherit, restart/multi-replica persistence, multi-role precedence, cross-tenant/resource attacks, immutable-role boundaries, concurrency, and audit atomicity.
- Generate positive and negative authorization cases for every canonical permission and role/scope combination. Add real endpoint E2E tests for every privilege boundary and high-risk operation, plus a generated route/enforcement coverage test for the complete catalog.
- Add UI unit/accessibility tests and Playwright flows for role templates, member overrides, reset/confirmation, reload persistence, errors, and owner/admin restrictions.
- Document the final catalog, defaults, precedence, and studio behavior in a new permission-studio spec; update architecture/API docs and mark `UPS-01`/`UPS-02` complete only after full pre-PR checks pass.
- Run migration tests against representative existing data and verify no existing valid role loses required access accidentally; every intentional default change must appear in the policy change report.

## 8. Production rollout, observability, and rollback
- Ship in additive stages: schema/indexes first; read/write policy service dark-launched with decision comparison telemetry; canonical enforcement migrated by domain; studio enabled only after authoritative reads/writes and invalidation are live. Never run mixed presentation-only and authoritative override behavior.
- During shadow comparison, log structured old/new decision mismatches without sensitive payloads. Track allow/deny counts, reason codes, latency, policy revision, stale-conflict rate, and audit failures; alert on cross-tenant mismatches, evaluator errors, or unexpected deny spikes.
- Define deployment compatibility for old app/API processes and capability payloads. Keep a bounded dual-read compatibility path only where required, with a removal task and deadline; never fall back to allow when policy data is unavailable.
- Provide a safe rollback that disables custom overrides and returns to the versioned canonical policy without dropping audit/override data. Test forward migration, rollback behavior, policy revision invalidation, and multi-replica consistency in staging.
- Before release run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`, the full authorization E2E matrix, migration/seed verification, and post-deploy smoke tests for owner, tenant admin, workspace admin, project manager, member, support, and superadmin personas.