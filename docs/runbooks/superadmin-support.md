# Superadmin support (no impersonation)

Platform staff use `apps/platform-admin` to manage tenant metadata. **Platform users cannot impersonate tenant members** (decision D13).

## Triage flow

1. Confirm the tenant in **Tenants** — note `status`, plan, workspace/member counts, owner email.
2. Check **Audit log** for recent platform actions (`platform.tenant.*`, `platform.login`).
3. Ask the **tenant owner** to reproduce the issue while screen-sharing, or to export data from the admin app (Exports).
4. Escalate to engineering with tenant ID, audit event IDs, and timestamps.

## What platform staff can do

| Action                          | Where                         |
| ------------------------------- | ----------------------------- |
| Provision tenant + temp owner   | Tenants → Create tenant       |
| Suspend / plan override / churn | Tenant detail → PATCH actions |
| Review staff actions            | Audit log                     |

## What platform staff cannot do

- Log in as a tenant user or workspace member
- View customer timesheets without the owner sharing exports
- Hard-delete tenant rows (use churn runbook instead)

## Audit log retention

Events are stored indefinitely in `platform_audit_events`. Ops may archive rows older than 24 months via a future maintenance job; do not delete rows manually without legal review.

## Related

- [on-call-tenant-triage.md](./on-call-tenant-triage.md) — Sentry/Railway tenant lookup, subscription triage
- [tenant-churn.md](./tenant-churn.md) — offboarding workflow
- [platform-admin.md](../specs/platform-admin.md) — API and UI reference
