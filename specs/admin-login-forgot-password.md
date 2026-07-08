# Test Plan — Login & Forgot Password (Admin App / Workspace Admin role)

**Module:** `admin-login-forgot-password`
**Target application:** https://chrono-mint-admin.vercel.app/ (Admin app, `X-Auth-Scope: admin`)
**Source of truth:** [docs/qa/acceptance-criteria-login-forgot-password.md](../docs/qa/acceptance-criteria-login-forgot-password.md)
**Relationship to prior run:** Reuses the same acceptance criteria as [login-forgot-password.md](./login-forgot-password.md) (client app), retargeted at the Admin app and a Workspace Admin / Tenant Owner account. Scenario IDs are prefixed `ADM-` to keep artifacts distinct.

**Screens confirmed via live exploration (Playwright MCP):**

| Screen | URL | Key elements |
|---|---|---|
| Admin sign in | `/login` | Heading "Admin sign in", Email textbox, Password textbox + "Show password" toggle, "Sign in" button, "Forgot password?" link → `/forgot-password` |
| Forgot password | `/forgot-password` | Identical structure/copy to the client app — Email textbox, "Send reset link" button, "Back to sign in" link → `/login` |
| Select context | `/select-context` | **New vs. client app.** Shown after login when the user has 3+ contexts (org + 2+ workspaces). Lists "Organization" (Tenant Owner) and each accessible workspace with role labels. |
| Dashboard (post-login) | `/dashboard` | Full Workspace Admin nav: Dashboard, Team Management, Project managers, Projects, Categories, Team Live, Approvals, Time Tracker, Notifications, Hourly rates (billing), Exports, Workspace settings, Support |

The Login and Forgot Password components are visually and structurally **identical** to the client app (shared `@kloqra/ui` package) — defects found in one are likely present in the other.

---

## Test data used

| Field | Value | Notes |
|---|---|---|
| Email | `scittenantowner@yopmail.com` | Real test account — Tenant Owner of "SCIT Organization" |
| Password | `Password1@` | |
| Role | Tenant Owner + Workspace Admin on 2 workspaces ("Integritas", "SCIT Internal") | Triggers `/select-context` picker per [TENANT_RBAC.md §4](../docs/architecture/TENANT_RBAC.md) |

Additional test data still unavailable this run (same gaps as the client-app test plan): forced-password-change account, unverified-email account, 2FA-enabled account, a **Member**-role account (for a negative role-access comparison), email inbox access for real reset-token retrieval.

---

## Login scenarios

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| ADM-LGN-01 | Successful login with valid credentials → context picker | Tenant Owner test account | 1. Go to `/login` 2. Enter valid email + password 3. Click "Sign in" | Redirected to `/select-context` (3+ contexts: Organization + 2 workspaces) rather than straight to `/dashboard` | P0 | AC-1, AC-7 |
| ADM-LGN-02 | Selecting a workspace from the context picker lands on its dashboard | Logged in, on `/select-context` | 1. Click a workspace card (e.g. "Integritas") | Redirected to `/dashboard`; sidebar shows full Workspace Admin nav (Team Management, Projects, Billing, Exports, Workspace settings, etc.) | P0 | AC-7, AC-12 |
| ADM-LGN-03 | Login fails with wrong password | none | 1. Go to `/login` 2. Enter valid email + wrong password 3. Click "Sign in" | Generic error shown, no session, stays on `/login` | P0 | AC-2 |
| ADM-LGN-04 | Login fails with unknown email (no enumeration) | none | 1. Go to `/login` 2. Enter non-existent email + any password 3. Click "Sign in" | Same generic error as ADM-LGN-03 | P0 | AC-2 |
| ADM-LGN-05 | Rate limiting after repeated failed attempts | none | 1. Submit invalid login 6+ times within 60s | Throttled (429) before window resets | P1 | AC-3 |
| ADM-LGN-06 | Role-based nav: Workspace Admin sees admin-only areas | ADM-LGN-02 done | 1. Inspect sidebar nav after landing on workspace dashboard | Billing ("Hourly rates"), Exports, Team Management, Projects, Workspace settings are all visible/accessible — items a Member role must **not** see | P1 | AC-12 |
| ADM-LGN-07 | Admin app scope isolation from Client app | Logged into both apps in the same browser | 1. Log in on `/login` (admin) 2. In a separate tab, log into the client app with the same or a different account | Both sessions remain independently valid; scoped cookies/localStorage (`cm-admin-*` vs `cm-client-*`) don't collide | P2 | AC-8 |
| ADM-LGN-08 | Empty-field client-side validation | none | 1. Go to `/login` 2. Click "Sign in" with empty fields | Inline "Email is required" / "Password is required"; no API call | P2 | UI baseline |
| ADM-LGN-09 | Show/hide password toggle | none | 1. Type a password 2. Click "Show password" | Input type toggles `password` ↔ `text` | P3 | UI baseline |
| ADM-LGN-10 | "Forgot password?" link navigates correctly | none | 1. Click "Forgot password?" | Navigates to `/forgot-password` | P2 | UI baseline |
| ADM-LGN-11 [defect regression] | Enter-then-click must not double-submit `/auth/login` | none | 1. Fill credentials 2. Press Enter 3. Wait ~1.5s 4. Click "Sign in" | Exactly one `/auth/login` request (currently **fails** — same root cause as **KAN-8**, confirmed on the client app; verify whether it also reproduces here since the component is shared) | P0 | AC-3 (quota), KAN-8 |

## Forgot Password scenarios

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| ADM-FPW-01 | Request reset link with the registered admin email | Tenant Owner account | 1. Go to `/forgot-password` 2. Enter `scittenantowner@yopmail.com` 3. Click "Send reset link" | Generic confirmation message; single `POST /auth/forgot-password` (scope=admin) → 201 | P0 | AC-14 |
| ADM-FPW-02 | Request reset link with an unregistered email | none | Same as above with a non-existent email | Identical generic confirmation — no enumeration | P0 | AC-14 |
| ADM-FPW-03 | Reset password with invalid/expired token | none | 1. Go to `/reset-password?token=invalid-bogus-token` 2. Submit a policy-valid new password | `401 "Password reset link is invalid or expired"`; password not changed | P0 | AC-17 |
| ADM-FPW-04 | New password fails policy validation | none | 1. Go to `/reset-password?token=...` 2. Enter a weak password (e.g. `weak`) | Client-side "Weak" indicator; submission blocked, no API call | P1 | AC-19, AC-13 |
| ADM-FPW-05 | "Back to sign in" link navigates correctly | none | 1. Go to `/forgot-password` 2. Click "Back to sign in" | Navigates to `/login` | P3 | UI baseline |
| ADM-FPW-06 [defect regression] | Enter-then-click must not double-submit `/auth/reset-password` | none | 1. Go to `/reset-password?token=invalid-bogus-token` 2. Fill passwords 3. Press Enter 4. Wait ~1.5s 5. Click "Reset password" | Exactly one request (verify whether **KAN-8** reproduces on the admin app's reset form too) | P0 | AC-20, KAN-8 |
| ADM-FPW-07 | Platform-scope isolation not applicable here | — | — | Out of scope — platform/superadmin scope belongs to the separate `platform-admin` app, not this one | — | AC-21 (not tested) |

## Blocked scenarios (test data unavailable this run)

Same categories as the client-app plan: forced password change, unverified email, 2FA, and additionally here — a **Member**-role account to negatively verify role-based nav restrictions (ADM-LGN-06 currently only proves the positive/Admin case), and email inbox access for real reset-token retrieval (blocks the full happy-path reset-password flow, same as client).

## Coverage note

This plan intentionally does **not** re-derive every AC from scratch — it cross-references the client-app plan and focuses on what's *different* for the Admin app: the tenant-owner context picker, workspace-admin role nav, and confirming whether the known KAN-8 double-submit defect is shared-component-wide (affecting both apps) or client-specific.
