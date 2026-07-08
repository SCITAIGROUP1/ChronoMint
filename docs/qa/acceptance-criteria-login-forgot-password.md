# Acceptance Criteria — Login & Forgot Password

> Derived from `docs/architecture/AUTH.md`, `docs/architecture/MULTI_DEVICE_SESSIONS.md`, `docs/architecture/TENANT_RBAC.md`, `docs/architecture/CONTEXT.md`, `docs/specs/auth-workspace.md`, `docs/specs/user-profile.md`, and the current implementation (`apps/api/src/modules/auth/`, `packages/contracts/src/dto/auth.dto.ts`, `packages/contracts/src/dto/common.dto.ts`).

---

## 1. Login Module

### AC-1: Successful login

- **Given** a user with a verified email, no pending forced password change, and 2FA disabled
- **When** they submit valid email + password to `POST /auth/login`
- **Then** the response returns `accessToken`, `user`, `workspaceId`, `workspaceName`, `workspaceRole`
- **And** the API sets scoped httpOnly cookies: `access_token_{scope}` (~15 min) and `refresh_token_{scope}` (~7 days), scoped by `X-Auth-Scope` (`client` / `admin`)
- **And** the frontend stores `accessToken` in the scoped `localStorage` key (`cm-client-*` / `cm-admin-*`)

### AC-2: Invalid credentials

- **Given** a wrong email or password
- **When** the user submits login
- **Then** the API returns `401 Unauthorized` with a generic invalid-login message
- **And** the response does **not** reveal whether the email exists (same message for unknown email vs. wrong password)

### AC-3: Rate limiting on login

- **Given** repeated login attempts from the same client
- **When** more than **5 requests per 60 seconds** are made to `/auth/login`
- **Then** subsequent requests are throttled (429) until the window resets

### AC-4: Forced password change (temporary/invited password)

- **Given** a user whose account has `mustChangePassword = true` (e.g., invited with a temporary password)
- **When** they log in with valid credentials
- **Then** the API returns `{ requiresPasswordChange: true, pendingToken }` instead of a session
- **And** the client must call the "set initial password" flow with `pendingToken` + new password before a session is issued
- **And** the new password must pass the password policy (AC-13)
- **And** all existing refresh tokens for the user are revoked once the password is set

### AC-5: Unverified email blocks login

- **Given** a user whose `emailVerifiedAt` is null
- **When** they submit valid credentials
- **Then** the API returns `{ requiresEmailVerification: true, email }` instead of a session
- **And** no access/refresh tokens are issued until the email is verified

### AC-6: Two-factor authentication (TOTP) challenge

- **Given** a user with TOTP enabled (`totpEnabledAt` + `totpSecret` set)
- **When** they submit valid email + password without a `totpCode`
- **Then** the API returns `{ requires2fa: true, pendingToken }`
- **When** they resubmit with `pendingToken` and a 6-digit `totpCode`
- **Then** a valid code completes login and issues a session
- **And** an invalid code returns `401 Unauthorized` ("Invalid authentication code") without issuing tokens

### AC-7: Workspace context on login

- **Given** a user with one or more workspace memberships
- **When** login succeeds
- **Then** the session is built from the user's (first) membership, returning `workspaceId` and `workspaceRole` (`ADMIN` | `MEMBER`)
- **And** a user with **no** memberships still receives a valid session (workspace-less), per `resolveAuthSessionForUser`

### AC-8: Multi-device / multi-app login isolation

- **Given** a user already logged in on Device A (or the Admin app)
- **When** the same user logs in on Device B (or the Client app) in the same browser
- **Then** both sessions remain valid independently — separate scoped cookies and `localStorage` keys per app/device
- **And** logging out on one device/app does not affect the other (`DELETE /auth/logout` clears only the calling scope)

### AC-9: Stale workspace context after switch

- **Given** a user switches active workspace on Device A (`POST /auth/switch-workspace`)
- **When** Device B sends a request with its old `X-Workspace-Id`
- **Then** the API returns `403 Forbidden` (workspace mismatch) until Device B re-authenticates or switches workspace

### AC-10: Session/token refresh

- **Given** an expired access token but a valid scoped refresh cookie
- **When** the client calls `POST /auth/refresh` with the matching `X-Auth-Scope`
- **Then** a new access token is issued and the scoped access cookie is updated
- **And** the refresh does not change the user's active `workspaceId`
- **And** a concurrent duplicate refresh within the grace window (`REFRESH_ROTATION_GRACE_MS`, default 10s) returns a new access token without revoking the token family

### AC-11: Login blocked in production without Origin match

- **Given** production deployment (cross-site Vercel + Railway)
- **When** a login request's `Origin` header does not match a configured `FRONTEND_ORIGIN`
- **Then** the request is rejected (CSRF mitigation)

### AC-12: Role-based post-login access

- **Given** a successful login
- **Then** `ADMIN` role can access project/team/billing/reporting/export-wizard features; `MEMBER` role is restricted to timer, own timelogs, and self-export (`POST /export/me`)

### AC-13: Password policy enforced (shared with reset/change flows)

- **Given** any password is submitted for initial-password-set, reset, or change
- **Then** it must be 8–128 characters and contain at least one uppercase letter, one lowercase letter, one digit, and one special character — otherwise the request is rejected with a validation error

---

## 2. Forgot Password Module

### AC-14: Request a password reset link

- **Given** a user (client/admin scope) enters their email on the "forgot password" form
- **When** the app calls `POST /auth/forgot-password` with `{ email }`
- **Then** the API always responds `{ ok: true }` — **regardless of whether the email exists** (prevents account/email enumeration)
- **And** if the email matches a real account, a single-use reset token is generated, hashed, stored with a **1-hour expiry**, and a reset email is sent asynchronously containing the reset URL
- **And** if the email does not match any account, no email is sent but the response is identical

### AC-15: Rate limiting on forgot-password requests

- **Given** repeated requests from the same client
- **When** more than **5 requests per 60 seconds** are made to `/auth/forgot-password`
- **Then** subsequent requests are throttled (429)

### AC-16: Reset password with a valid token

- **Given** a user clicks the emailed reset link containing a valid, unexpired token
- **When** they submit `POST /auth/reset-password` with `{ token, newPassword }` and `newPassword` satisfies the password policy (AC-13)
- **Then** the account's password hash is updated
- **And** the `mustChangePassword` flag is cleared (client scope)
- **And** the reset token/hash and expiry are cleared so the token cannot be reused
- **And** **all existing refresh tokens for the user are revoked** (all other devices/sessions are signed out)
- **And** the API responds `{ ok: true }`

### AC-17: Reset password with an invalid or expired token

- **Given** a token that does not match any stored hash, or one whose `passwordResetExpiresAt` has passed
- **When** `POST /auth/reset-password` is called
- **Then** the API returns `401 Unauthorized` ("Password reset link is invalid or expired")
- **And** the password is **not** changed

### AC-18: Reset token is single-use

- **Given** a token that was already successfully used to reset a password
- **When** the same token is submitted again
- **Then** the request fails as invalid/expired (AC-17), since the token hash was cleared on first use

### AC-19: New password must meet policy

- **Given** a valid reset token
- **When** `newPassword` does not meet the password policy (AC-13 — length, uppercase, lowercase, digit, special character)
- **Then** the request is rejected with a validation error before any database change occurs

### AC-20: Rate limiting on reset-password requests

- **Given** repeated reset attempts from the same client
- **When** more than **5 requests per 60 seconds** are made to `/auth/reset-password`
- **Then** subsequent requests are throttled (429)

### AC-21: Platform (superadmin) scope isolation

- **Given** a forgot/reset-password request sent with `X-Auth-Scope: platform`
- **When** processed
- **Then** it operates against the separate `platformUser` table (own token fields, own mailer template, own reset URL builder) and never touches regular workspace user accounts, and vice versa

### AC-22: No session issued directly from reset

- **Given** a successful password reset
- **Then** the response is only `{ ok: true }` — the user must explicitly log in again with the new password (no auto-login/token issuance on reset)

---

## Out of scope / not yet implemented (do not test as defects)

- Account lockout after N failed login attempts (not implemented — only IP/route-level throttling exists)
- "Logout all devices" single-button action (documented as a future enhancement in `MULTI_DEVICE_SESSIONS.md`)
- Per-device session naming/management beyond the sessions list (`GET/DELETE /users/me/sessions`)
