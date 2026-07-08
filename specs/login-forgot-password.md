# Test Plan — Login & Forgot Password

**Module:** `login-forgot-password`
**Target application:** https://chrono-mint-client.vercel.app/ (Client app)
**Source of truth:** [docs/qa/acceptance-criteria-login-forgot-password.md](../docs/qa/acceptance-criteria-login-forgot-password.md)
**Screens confirmed via live exploration (Playwright MCP):**

| Screen | URL | Key elements |
|---|---|---|
| Sign in | `/login` | Email textbox, Password textbox + "Show password" toggle, "Sign in" button, "Forgot password?" link → `/forgot-password` |
| Forgot password | `/forgot-password` | Email textbox, "Send reset link" button, "Back to sign in" link → `/login` |

Screenshots: `login-page.png`, `forgot-password-page.png` (captured during plan exploration).

---

## Test data prerequisites

Before Step 3 (exploratory testing) and Step 5 (automation execution), the following test accounts/data are needed. **Do not use real customer data.**

| ID | Data needed | Used by |
|---|---|---|
| TD-1 | Standard verified account, 2FA disabled, no forced password change (email + password) | LGN-01, LGN-09, LGN-12, FPW-01, FPW-04..08, FPW-10 |
| TD-2 | Account with `mustChangePassword = true` (e.g., freshly invited user) | LGN-05 |
| TD-3 | Account with `emailVerifiedAt = null` (unverified) | LGN-06 |
| TD-4 | Account with TOTP/2FA enabled + access to a live authenticator (or seeded secret) | LGN-07, LGN-08 |
| TD-5 | Account belonging to 2+ workspaces | LGN-09 (multi-membership variant), LGN-11 |
| TD-6 | Admin-role account and Member-role account | LGN-14 |
| TD-7 | Email inbox access (or mail-capture tool / DB access) to retrieve reset-password tokens | FPW-04, FPW-05, FPW-06 |

If TD-2/TD-3/TD-4/TD-7 aren't available in the target environment, mark the corresponding scenarios **Blocked** in exploratory results rather than skipping them silently.

---

## Login scenarios

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| LGN-01 | Successful login with valid credentials | TD-1 exists | 1. Go to `/login` 2. Enter valid email + password 3. Click "Sign in" | Redirected to authenticated dashboard/home; session established (access token + cookies) | P0 | AC-1 |
| LGN-02 | Login fails with wrong password | TD-1 exists | 1. Go to `/login` 2. Enter TD-1 email + wrong password 3. Click "Sign in" | Generic error shown (no session); page stays on `/login` | P0 | AC-2 |
| LGN-03 | Login fails with unknown email (no enumeration) | none | 1. Go to `/login` 2. Enter a non-existent email + any password 3. Click "Sign in" | Same generic error message as LGN-02 (message must not differ) | P0 | AC-2 |
| LGN-04 | Rate limiting after repeated failed attempts | none | 1. Submit invalid login 6 times within 60s | 6th (and further) requests are throttled (429 / "too many attempts" UI state) before the 60s window resets | P1 | AC-3 |
| LGN-05 | Forced password change on first login | TD-2 exists | 1. Log in with TD-2's temporary credentials | User is routed to a "set new password" step (not the dashboard); a valid new password (per policy) completes login; all prior sessions are invalidated | P0 | AC-4, AC-13 |
| LGN-06 | Unverified email blocks login | TD-3 exists | 1. Log in with TD-3 valid credentials | User is routed to an "verify your email" state, not the dashboard; no session/tokens issued | P0 | AC-5 |
| LGN-07 | 2FA valid code completes login | TD-4 exists | 1. Log in with TD-4 credentials 2. Enter valid 6-digit TOTP code when prompted | Login succeeds; dashboard loads | P0 | AC-6 |
| LGN-08 | 2FA invalid code rejected | TD-4 exists | 1. Log in with TD-4 credentials 2. Enter an incorrect 6-digit code | Error shown ("Invalid authentication code"); no session issued; user can retry | P1 | AC-6 |
| LGN-09 | Workspace context present after login | TD-1 (or TD-5) exists | 1. Log in 2. Inspect returned session / app state | Active workspace name/role is visible in the UI (e.g., header/sidebar) matching the account's membership | P1 | AC-7 |
| LGN-10 | Parallel sessions on two devices/browsers don't conflict | TD-1 exists | 1. Log in as TD-1 in Browser Context A 2. Log in as TD-1 in Browser Context B (different profile) | Both sessions remain active independently; using one does not log out the other | P2 | AC-8 |
| LGN-11 | Stale workspace after switch is rejected | TD-5 exists (multi-workspace) | 1. Log in on Context A 2. Switch workspace on Context A 3. On Context B (still old session), trigger an authenticated request | Context B's request is rejected (403 workspace mismatch) rather than silently using the wrong workspace | P2 | AC-9 |
| LGN-12 | Session survives access-token expiry via silent refresh | TD-1 exists | 1. Log in 2. Wait past access-token lifetime (or force-expire) 3. Perform an authenticated action | Action succeeds transparently (silent refresh), no forced re-login | P2 | AC-10 |
| LGN-13 | Cross-origin login request rejected in production | none (API-level) | 1. Send `POST /auth/login` with a mismatched/missing `Origin` header directly to the API | Request rejected (CSRF mitigation) | P2 | AC-11 |
| LGN-14 | Role-based UI differs for Admin vs Member | TD-6 exists | 1. Log in as Member 2. Note visible nav/features 3. Log in as Admin 4. Compare | Member cannot see admin-only areas (billing, project CRUD, admin export); Admin can | P1 | AC-12 |
| LGN-15 | Empty-field client-side validation | none | 1. Go to `/login` 2. Click "Sign in" with both fields empty | Inline validation errors shown; no request sent to the API | P2 | UI baseline |
| LGN-16 | Show/hide password toggle | none | 1. Go to `/login` 2. Type a password 3. Click "Show password" | Password becomes visible as plain text; toggling again re-masks it | P3 | UI baseline |
| LGN-17 | "Forgot password?" link navigates correctly | none | 1. Go to `/login` 2. Click "Forgot password?" | Navigates to `/forgot-password` | P2 | UI baseline |

---

## Forgot Password scenarios

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| FPW-01 | Request reset link with a registered email | TD-1 exists | 1. Go to `/forgot-password` 2. Enter TD-1's email 3. Click "Send reset link" | Generic success confirmation shown (e.g., "If an account exists, we've sent a link"); an email is sent with a reset URL (TD-7 needed to verify receipt) | P0 | AC-14 |
| FPW-02 | Request reset link with an unregistered email | none | 1. Go to `/forgot-password` 2. Enter an email not in the system 3. Click "Send reset link" | **Identical** success confirmation to FPW-01 — UI gives no hint the email doesn't exist | P0 | AC-14 |
| FPW-03 | Rate limiting on forgot-password requests | none | 1. Submit the forgot-password form 6 times within 60s | 6th+ request is throttled (429 / UI cooldown state) | P1 | AC-15 |
| FPW-04 | Reset password with a valid, unexpired token | TD-1 + TD-7 (token retrieval) | 1. Trigger FPW-01 2. Open the emailed reset link 3. Submit a new password meeting policy | Password updated; all existing sessions for the account are revoked; confirmation shown; user must log in again | P0 | AC-16, AC-22 |
| FPW-05 | Reset password with an invalid/expired token | crafted/expired token | 1. Open reset-password URL with a bad or expired token 2. Submit any valid-format new password | Error shown: reset link invalid or expired; password is **not** changed | P0 | AC-17 |
| FPW-06 | Reset token cannot be reused | TD-1 + TD-7 | 1. Complete FPW-04 successfully 2. Reuse the same reset link again with another new password | Second attempt fails as invalid/expired (same as FPW-05) | P1 | AC-18 |
| FPW-07 | New password fails policy validation | valid reset token | 1. Open a valid reset link 2. Enter a new password that violates policy (e.g., `abc123`, no uppercase/special char, or too short) | Inline validation error listing the unmet rule(s); no API call / no password change | P1 | AC-19, AC-13 |
| FPW-08 | Rate limiting on reset-password requests | none | 1. Submit `POST /auth/reset-password`-backed form 6 times within 60s | 6th+ request throttled (429) | P2 | AC-20 |
| FPW-09 | No auto-login after successful reset | TD-1 + TD-7 | 1. Complete FPW-04 | User lands on a confirmation/login page, **not** the authenticated dashboard; no access token is issued directly from reset | P1 | AC-22 |
| FPW-10 | "Back to sign in" link navigates correctly | none | 1. Go to `/forgot-password` 2. Click "Back to sign in" | Navigates to `/login` | P3 | UI baseline |

---

## Out of scope for this plan (per acceptance criteria doc)

- Account lockout after N failed attempts (not implemented)
- "Logout all devices" button (future enhancement, not shipped)
- Platform/superadmin (`X-Auth-Scope: platform`) forgot/reset-password flow — belongs to the internal platform-admin app, not the client app under test here (AC-21 noted but not tested in this plan)

## Coverage check

All acceptance criteria AC-1 through AC-22 from `docs/qa/acceptance-criteria-login-forgot-password.md` map to at least one scenario above, except AC-21 (platform-scope isolation), which is explicitly out of scope for the client-app target URL in this run.
