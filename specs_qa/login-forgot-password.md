# Test Plan — Login & Forgot Password

**Module:** `login-forgot-password`
**Target application:** Client / Member app — https://chrono-mint-client.vercel.app/
**Test account:** `peter123@yopmail.com` / `Password1@` (Member role, single workspace: "Integritas")
**Source of truth:** `docs/qa/user_stories/acceptance-criteria-login-forgot-password.md` (29 ACs, expanded 2026-07-09; derived from GitHub #561 and #562)

> This plan supersedes the 2026-07-08 version of this file, which only covered AC-1–AC-22 under the pre-expansion numbering. It has been fully rewritten (not appended) to cover all 29 current ACs: AC-1–AC-20 (Login module) and AC-21–AC-29 (Forgot Password module).

## Screens confirmed via live exploration (Playwright MCP, 2026-07-09)

| Screen | URL | Key elements observed live |
|---|---|---|
| Sign in | `/login` | "Sign in" heading, Email textbox, Password textbox + "Show password" toggle, **"Sign in"** submit button (not "Login"), "Forgot password?" link → `/forgot-password` |
| Forgot password | `/forgot-password` | "Forgot password" heading, Email textbox, "Send reset link" button, "Back to sign in" link → `/login` |
| Reset password | `/reset-password?token=...` | "Reset password" heading, New password + Confirm password fields (each with show/hide toggle), live password-strength hint (e.g. "Weak"), "Reset password" button |
| Authenticated dashboard | `/dashboard` | Sidebar shows a "Workspace" section with a workspace switcher button (`"Integritas Member"` — name + role), left-nav (Dashboard, Timer, Time Tracker, Timesheet, Submissions, Notifications, My projects), no admin-only nav items (billing, project CRUD, export-wizard) visible for this Member account |

Live checks performed this session (see inline notes per scenario below):
- Submitted the login form empty → confirmed field-level errors "Email is required" / "Password is required".
- Logged in with valid TD-1 credentials → landed directly on `/dashboard` (no Workspace Selection screen — single-workspace account, consistent with AC-17 bypass branch).
- Navigated to `/login` again while the session was still active → the login form rendered again (not redirected away), confirming the AC-16 known gap live.
- Submitted `/forgot-password` with a registered email and with a fabricated unregistered email → both returned the identical message "If an account exists for that email, we sent a password reset link."
- Opened `/reset-password?token=<fabricated>` and submitted a policy-valid password → network log showed `401` from `POST /auth/reset-password`, password not changed, no session/redirect.
- On the same reset-password screen, typed a policy-violating password (`weak`) → inline strength indicator showed "Weak" before/without a successful submit, consistent with client-side policy enforcement.

## Test data prerequisites

The single seeded Member account (`peter123@yopmail.com`) is single-workspace, 2FA-disabled, verified, no forced password change. Several ACs require account/environment states this account cannot produce. Per task instructions, scenarios needing those states are marked **"Code-verified only — not live-walkable with the current seeded account"** rather than skipped or silently assumed.

| ID | Data needed | Used by | Available this session? |
|---|---|---|---|
| TD-1 | Standard verified account, 2FA disabled, no forced password change | LGN-01, LGN-02, LGN-03, LGN-17, LGN-18, LGN-19, WKS-01, FPW-01, FPW-02, FPW-05, FPW-07 | Yes (`peter123@yopmail.com`) |
| TD-2 | Account with `mustChangePassword = true` | LGN-08 | No |
| TD-3 | Account with `emailVerifiedAt = null` | LGN-09 | No |
| TD-4 | Account with TOTP/2FA enabled + authenticator access | LGN-10, LGN-11 | No |
| TD-5 | Account belonging to 2+ workspaces | WKS-02, WKS-03, WKS-04, WKS-05 (full switch verification), LGN-22 | No — `peter123` has exactly one workspace membership ("Integritas") |
| TD-6 | Admin-role account (same or comparable workspace) for RBAC comparison | LGN-06 | Partial — Member-side nav restrictions observed live; Admin-side needs a separate account |
| TD-7 | Email inbox / mail-capture access to retrieve real reset tokens | FPW-04, FPW-06, FPW-09 | No |
| TD-8 | Account with zero workspace memberships (workspace-less session) | LGN-20 | No |

If any of TD-2/3/4/5/6/7/8 become available in a future run, re-run the corresponding scenarios live and update this plan's "Live-grounded" annotations.

---

## 1. Login — Core Authentication (AC-1, AC-2, AC-3, AC-11, AC-12, AC-13)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| LGN-01 | Successful login with valid credentials | TD-1 exists | 1. Go to `/login` 2. Enter TD-1 email + password 3. Click "Sign in" | **Live-grounded.** Redirected to `/dashboard`; session established; workspace "Integritas" / role "Member" visible in sidebar | P0 | AC-1 |
| LGN-02 | Login fails with wrong password | TD-1 exists | 1. Go to `/login` 2. Enter TD-1 email + an incorrect password 3. Click "Sign in" | Generic 401 error shown; no session created; page stays on `/login` | P0 | AC-2 |
| LGN-03 | Login fails with unknown email (no enumeration) | none | 1. Go to `/login` 2. Enter a non-existent email + any password 3. Click "Sign in" | Identical generic error message to LGN-02 — response must not reveal whether the email exists | P0 | AC-2 |
| LGN-04 | Rate limiting after repeated failed login attempts | none | 1. Submit invalid login 6+ times within 60 seconds against `POST /auth/login` | 6th+ request returns `429` until the 60s window resets. **Code-verified only — not live-walkable with the current seeded account:** deliberately hammering the production-shared `/auth/login` endpoint 6x/60s risks tripping the limiter for the shared seeded account and affecting other concurrent test runs; verify via API/unit test instead | P1 | AC-3 |
| LGN-05 | Cross-origin login request rejected in production | none (API-level) | 1. Send `POST /auth/login` directly with a mismatched/missing `Origin` header | Request rejected (CSRF mitigation). **Code-verified only — not live-walkable via the browser UI:** this is a server-side header check exercised only via direct API calls in a production-like deployment; the Playwright-driven browser always sends a same-origin `Origin` header, so the negative path can't be triggered from the UI | P2 | AC-11 |
| LGN-06 | Role-based UI differs for Admin vs Member | TD-6 exists (Admin + Member accounts) | 1. Log in as Member (TD-1) 2. Note visible nav 3. Log in as Admin 4. Compare | **Partially live-grounded.** Confirmed live: Member (`peter123`) sees only Dashboard / Timer / Time Tracker / Timesheet / Submissions / Notifications / My projects — no billing, project CRUD, or admin export-wizard nav items. Admin-side comparison needs a TD-6 admin account not available this session — full bidirectional check remains **code-verified only** for the Admin half | P1 | AC-12 |
| LGN-07 | Password policy enforced on forced-password-change / reset / change flows | see LGN-08 (forced change) and FPW-07 (reset) | (Covered by LGN-08 and FPW-07 — AC-13 does not apply to the login form itself, only to password-setting flows) | Not independently testable — cross-reference only, no standalone execution needed | — | AC-13 |

---

## 2. Login — Special Account States (AC-4, AC-5, AC-6)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| LGN-08 | Forced password change on first login | TD-2 exists | 1. Log in with TD-2's temporary credentials | API returns `{ requiresPasswordChange: true, pendingToken }` instead of a session; client must complete "set initial password" with a policy-valid password before a session is issued; all prior refresh tokens revoked once set. **Code-verified only — not live-walkable with the current seeded account:** no TD-2 account exists in this session; verify via API/unit test or seed one for a future run | P0 | AC-4, AC-13 |
| LGN-09 | Unverified email blocks login | TD-3 exists | 1. Log in with TD-3's valid credentials | API returns `{ requiresEmailVerification: true, email }` instead of a session; no tokens issued. **Code-verified only — not live-walkable with the current seeded account:** no TD-3 account exists in this session | P0 | AC-5 |
| LGN-10 | 2FA valid code completes login | TD-4 exists | 1. Log in with TD-4 credentials 2. Submit valid 6-digit TOTP code when prompted | API returns `{ requires2fa: true, pendingToken }` on step 1; valid code + pendingToken completes login and issues a session. **Code-verified only — not live-walkable with the current seeded account:** no TD-4 (TOTP-enabled) account exists in this session | P0 | AC-6 |
| LGN-11 | 2FA invalid code rejected | TD-4 exists | 1. Log in with TD-4 credentials 2. Submit an incorrect 6-digit code | `401 Unauthorized` ("Invalid authentication code"); no session issued; user can retry. **Code-verified only — not live-walkable with the current seeded account:** no TD-4 account exists in this session | P1 | AC-6 |

---

## 3. Login — Screen Composition & Validation (AC-14, AC-15, AC-16)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| LGN-12 | Login screen presents expected fields and controls | none | 1. Go to `/login` (signed out) | **Live-grounded.** Screen shows: Email Address field, Password field, primary submit button, "Forgot password?" link. **Expected to fail against literal AC wording — known gap, not a new defect:** the submit button reads **"Sign in"**, not "Login" as ticket #561 literally specifies; functionally equivalent, confirmed via RQA #561 (2026-07-01) and re-confirmed live this session — do not re-file | P1 | AC-14 |
| LGN-13 | Required-field validation on empty submit | none | 1. Go to `/login` 2. Click "Sign in" with both Email and Password blank | **Live-grounded.** Each empty field shows its own inline required-field error ("Email is required" / "Password is required"); confirmed no `POST /auth/login` fired (form blocked client-side). **Expected to fail against literal AC wording — known gap, not a new defect:** the ticket specifies the literal wording "This field is required" per field; the implementation shows field-specific wording instead — wording difference only, validation itself works correctly. Confirmed via RQA #561 (2026-07-01) and re-confirmed live this session — do not re-file | P1 | AC-15 |
| LGN-14 | Partial empty submit (only one field blank) | none | 1. Go to `/login` 2. Enter a value in Email only 3. Click "Sign in" | Only the Password field shows its required error; Email field shows no error; no API request sent | P2 | AC-15 |
| LGN-15 | Authenticated user navigating directly to `/login` | User has an active valid session (post LGN-01) | 1. Log in successfully 2. Navigate directly to `/login` again (e.g. via URL bar or back button) | Per literal AC-16 wording: user should be redirected away to their workspace, not shown the login form. **Live-grounded — expected to fail against literal AC wording, known gap, not a new defect:** confirmed this session that after a successful login, navigating back to `/login` re-rendered the full sign-in form — the user was **not** redirected away. Protected workspace routes do correctly redirect an unauthenticated user to `/login` (see LGN-16), but `/login` itself has no check for an already-authenticated user. Confirmed via RQA #561 (2026-07-01) and reproduced live this session — do not re-file as a new defect, already tracked in the source doc's "Known gaps" section | P1 | AC-16 |
| LGN-16 | Unauthenticated user redirected away from a protected route | none | 1. Ensure signed out 2. Navigate directly to a protected route, e.g. `/dashboard` | User is redirected to `/login` (this direction of the redirect *is* implemented, per AC-16's note) | P2 | AC-16 |
| LGN-17 | Show/hide password toggle | none | 1. Go to `/login` 2. Type a password 3. Click "Show password" | Password becomes visible as plain text; toggling again re-masks it | P3 | UI baseline (supports AC-14) |
| LGN-18 | "Forgot password?" link navigates correctly | none | 1. Go to `/login` 2. Click "Forgot password?" | Navigates to `/forgot-password` | P2 | UI baseline (supports AC-14) |

---

## 4. Post-Login Workspace Routing & Workspace Selection (AC-17, AC-18, AC-19, AC-20)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| WKS-01 | Single-workspace member bypasses Workspace Selection | TD-1 exists (single workspace) | 1. Log in with TD-1 credentials | **Live-grounded.** No Workspace Selection screen shown; user is routed directly to their startup page. Confirmed this session: landed on `/dashboard` (the account's configured startup page — consistent with AC-17's "default `/timer`, or the page set in Account Preferences" clause; `/dashboard` is not itself a discrepancy since Account Preferences can override the default) | P0 | AC-17 |
| WKS-02 | Multi-workspace member routed to Workspace Selection screen | TD-5 exists (2+ workspaces) | 1. Log in with TD-5 credentials | User is routed to the Workspace Selection screen instead of directly to a startup page. **Code-verified only — not live-walkable with the current seeded account:** `peter123@yopmail.com` has exactly one workspace membership ("Integritas"), so this screen was never reachable during this session's live exploration; needs a TD-5 multi-workspace account for a future pass | P0 | AC-17 |
| WKS-03 | Workspace Selection screen — card display | TD-5 exists, on Workspace Selection screen | 1. Observe the cards shown | Each workspace shown as a selectable card with Workspace Name, an initials-based gradient-colored avatar/logo, and the member's role badge for that workspace. **Code-verified only — not live-walkable with the current seeded account** (no TD-5). **Re-verify, do not assume fixed:** the AC doc records that a "Number of Projects" count per card (ticket #562 AC2) was missing at initial QA, filed as GitHub #644, and marked Completed — this has not been re-confirmed live; the next regression pass with a multi-workspace account must explicitly check whether the project count now renders | P1 | AC-18 |
| WKS-04 | Selecting a workspace from the Workspace Selection screen | TD-5 exists, on Workspace Selection screen | 1. Click a workspace card | `POST /auth/switch-workspace` is called with that workspace's ID; it becomes the active session workspace; user is redirected to their main working screen. **Code-verified only — not live-walkable with the current seeded account** (no TD-5) | P0 | AC-19 |
| WKS-05 | Switching workspaces without logging out (in-app switcher) | TD-5 exists, signed in | 1. Open the workspace switcher (left sidebar — confirmed live at `peter123`'s single-workspace button "Integritas Member") 2. Select a different workspace | Active workspace switches in place; no logout/re-login required. **Live-grounded for switcher location; expected to fail against literal AC wording for placement — known gap, not a new defect:** ticket #562 AC5 describes the switcher living in the "top" navigation bar; live exploration this session confirmed it instead sits in the **left sidebar** under a "Workspace" heading, showing "Integritas Member" (workspace name + role) as a clickable button. Confirmed via RQA #562 (2026-07-01) — do not re-file the placement difference as a new defect. The actual switch action (multi-workspace) remains **code-verified only — not live-walkable**, no TD-5 account available | P1 | AC-20 |

---

## 5. Session & Workspace Context (AC-7, AC-8, AC-9, AC-10)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| LGN-19 | Workspace context present after login | TD-1 exists | 1. Log in 2. Inspect the app UI for workspace name/role | **Live-grounded.** Sidebar "Workspace" section shows "Integritas" as workspace name and "Member" as role, matching the account's single membership | P1 | AC-7 |
| LGN-20 | Workspace-less user still receives a valid session | TD-8 exists (zero memberships) | 1. Log in with TD-8 credentials | Login succeeds and issues a valid session even though `workspaceId`/`workspaceRole` reflect no membership. **Code-verified only — not live-walkable with the current seeded account:** no TD-8 (workspace-less) account exists in this session; verify at the API/integration-test level | P2 | AC-7 |
| LGN-21 | Parallel sessions on two devices/apps don't conflict | TD-1 exists | 1. Log in as TD-1 in Browser Context A 2. Log in as TD-1 in Browser Context B (separate profile, or Admin app) | Both sessions remain valid independently (separate scoped cookies/localStorage keys); logging out on one does not affect the other. **Code-verified only — not live-walkable with the current seeded account:** requires a genuine second device/browser-profile context run in parallel, which this single Playwright session did not attempt; verify at the API/integration-test level or with two concurrent manual sessions | P2 | AC-8 |
| LGN-22 | Stale workspace context after switch is rejected on the other device | TD-5 exists (multi-workspace) | 1. Log in on Context A 2. Switch workspace on Context A 3. On Context B (still on the old session), send an authenticated request with the old `X-Workspace-Id` | Context B's request is rejected `403 Forbidden` (workspace mismatch) rather than silently using the stale workspace. **Code-verified only — not live-walkable with the current seeded account:** needs both a TD-5 multi-workspace account and a second device/browser context; neither was available this session | P2 | AC-9 |
| LGN-23 | Session survives access-token expiry via silent refresh | TD-1 exists | 1. Log in 2. Wait past the ~15-minute access-token lifetime (or force-expire) 3. Perform an authenticated action | `POST /auth/refresh` transparently issues a new access token using the scoped refresh cookie; active `workspaceId` is unchanged; no forced re-login. **Code-verified only — not live-walkable with the current seeded account:** requires waiting out or forcing access-token expiry, which a single planning-session Playwright run cannot safely or deterministically produce; verify at the API/integration-test level | P2 | AC-10 |
| LGN-24 | Concurrent duplicate refresh within grace window | TD-1 exists | 1. Fire two near-simultaneous `POST /auth/refresh` calls within the 10s rotation grace window | Both return a new access token; the refresh token family is not revoked. **Code-verified only — not live-walkable with the current seeded account:** requires precise concurrent-request timing control not available via the browser UI; verify at the API/integration-test level | P3 | AC-10 |

---

## 6. Forgot Password — Request Reset Link (AC-21, AC-22)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| FPW-01 | Request reset link with a registered email | TD-1 exists | 1. Go to `/forgot-password` 2. Enter TD-1's email 3. Click "Send reset link" | **Live-grounded.** Response: "If an account exists for that email, we sent a password reset link." A reset email is sent asynchronously with a 1-hour-expiry single-use token (not verifiable without TD-7 mailbox access) | P0 | AC-21 |
| FPW-02 | Request reset link with an unregistered email | none | 1. Go to `/forgot-password` 2. Enter an email not in the system 3. Click "Send reset link" | **Live-grounded.** Identical message to FPW-01 — confirmed same wording, "If an account exists for that email, we sent a password reset link.", no email sent (no enumeration) | P0 | AC-21 |
| FPW-03 | Rate limiting on forgot-password requests | none | 1. Submit the forgot-password form 6+ times within 60s | 6th+ request throttled `429`. **Code-verified only — not live-walkable with the current seeded account:** same rationale as LGN-04 — avoid deliberately tripping a shared production rate limiter during a routine planning session; verify via API/unit test | P1 | AC-22 |

---

## 7. Forgot Password — Reset Password (AC-23, AC-24, AC-25, AC-26, AC-27, AC-29)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| FPW-04 | Reset password with a valid, unexpired token | TD-1 + TD-7 (real token retrieval) | 1. Trigger FPW-01 2. Retrieve the reset URL from the account's inbox 3. Open it and submit a new policy-valid password | Password hash updated; `mustChangePassword` cleared; token/hash + expiry cleared; **all existing refresh tokens for the user revoked**; response `{ ok: true }`. **Code-verified only — not live-walkable with the current seeded account:** requires retrieving a real, valid reset token from TD-1's mailbox (TD-7), which this Playwright-only session has no access to | P0 | AC-23 |
| FPW-05 | Reset password with an invalid/expired token | crafted/fabricated token | 1. Open `/reset-password?token=<fabricated>` 2. Submit a policy-valid new password | **Live-grounded.** Confirmed via network log: `POST /auth/reset-password` returned `401`; password not changed; page remained on `/reset-password`, no session/redirect | P0 | AC-24 |
| FPW-06 | Reset token cannot be reused | TD-1 + TD-7 | 1. Complete FPW-04 successfully 2. Reuse the identical reset link with another new password | Second attempt fails as invalid/expired, same as FPW-05, since the token hash was cleared on first use. **Code-verified only — not live-walkable with the current seeded account:** depends on FPW-04 completing with a real token from TD-7, unavailable this session | P1 | AC-25 |
| FPW-07 | New password fails policy validation on reset | valid or fabricated reset token | 1. Open a reset-password link 2. Enter a new password violating policy (e.g. `weak` — no uppercase/digit/special char, too short) | **Live-grounded.** Confirmed: typing `weak` into New Password triggered an inline "Weak" strength indicator; request rejected before any password change takes effect | P1 | AC-26, AC-13 |
| FPW-08 | Rate limiting on reset-password requests | none | 1. Submit the reset-password form 6+ times within 60s | 6th+ request throttled `429`. **Code-verified only — not live-walkable with the current seeded account:** same rationale as LGN-04/FPW-03 — avoid deliberately tripping the shared production rate limiter | P2 | AC-27 |
| FPW-09 | No auto-login after successful reset | TD-1 + TD-7 | 1. Complete FPW-04 | Response is only `{ ok: true }`; user lands on a confirmation/login state, not the authenticated dashboard; no access token issued directly from the reset call. **Code-verified only — not live-walkable with the current seeded account:** depends on FPW-04 completing with a real token from TD-7, unavailable this session | P1 | AC-29 |
| FPW-10 | "Back to sign in" link navigates correctly | none | 1. Go to `/forgot-password` 2. Click "Back to sign in" | Navigates to `/login` | P3 | UI baseline (supports AC-21) |

---

## 8. Forgot Password — Platform Scope Isolation (AC-28)

| ID | Title | Preconditions | Steps | Expected Result | Priority | AC |
|---|---|---|---|---|---|---|
| FPW-11 | Platform-scope forgot/reset-password isolated from workspace users | request sent with `X-Auth-Scope: platform` | 1. Submit `POST /auth/forgot-password` and `POST /auth/reset-password` with `X-Auth-Scope: platform` for a platform-superadmin email | Operates only against the separate `platformUser` table (own token fields, mailer template, reset URL builder); never touches/affects regular workspace `user` records, and vice versa. **Code-verified only — not live-walkable from this module's target URL:** `X-Auth-Scope: platform` and the platform-superadmin forgot/reset flow belong to the Platform Admin app (`https://chrono-mint-platform-admin.vercel.app/`), a different app/environment row than this plan's Client/Member target; must be exercised (live or automated) against that app instead | P2 | AC-28 |

---

## Out of scope for this plan (per acceptance-criteria doc — do not test as defects)

- Account lockout after N failed login attempts (not implemented — only IP/route-level throttling exists).
- "Logout all devices" single-button action (documented as a future enhancement, not shipped).
- Per-device session naming/management beyond the sessions list (`GET/DELETE /users/me/sessions`).

## Known gaps vs. ticket wording (carried from the source doc — already tracked, not new defects)

- **AC-16** — the Login page does not redirect an already-authenticated user away from itself; only protected routes redirect an unauthenticated user to `/login`. Reproduced live this session (LGN-15).
- **AC-14 / AC-15** — copy wording differences only: submit button reads "Sign in" not "Login" (LGN-12); empty-field errors read "Email/Password is required" not the literal "This field is required" (LGN-13). Both reproduced live this session.
- **AC-20** — workspace switcher lives in the left sidebar, not the "top" navigation bar as the ticket implies. Location of the switcher confirmed live this session (WKS-05); the switch action itself was not fully exercised (no multi-workspace account available).
- **AC-18** — "Number of Projects" per workspace card was missing at initial QA (filed as GitHub #644, now marked Completed) — flagged for re-verification on the next regression pass with a multi-workspace account (WKS-03), not confirmed fixed this session.

Any scenario tagged with one of the above gaps that "fails" against the literal AC wording during exploratory/automated testing is an **expected, already-known result** — do not re-file it as a newly discovered defect in Steps 3/6 of the workflow.

## Coverage check

All 29 acceptance criteria (AC-1 through AC-29) from `docs/qa/user_stories/acceptance-criteria-login-forgot-password.md` map to at least one scenario above:

- AC-1 → LGN-01 · AC-2 → LGN-02, LGN-03 · AC-3 → LGN-04 · AC-4 → LGN-08 · AC-5 → LGN-09 · AC-6 → LGN-10, LGN-11 · AC-7 → LGN-19, LGN-20 · AC-8 → LGN-21 · AC-9 → LGN-22 · AC-10 → LGN-23, LGN-24 · AC-11 → LGN-05 · AC-12 → LGN-06 · AC-13 → LGN-08, FPW-07
- AC-14 → LGN-12 · AC-15 → LGN-13, LGN-14 · AC-16 → LGN-15, LGN-16 · AC-17 → WKS-01, WKS-02 · AC-18 → WKS-03 · AC-19 → WKS-04 · AC-20 → WKS-05
- AC-21 → FPW-01, FPW-02 · AC-22 → FPW-03 · AC-23 → FPW-04 · AC-24 → FPW-05 · AC-25 → FPW-06 · AC-26 → FPW-07 · AC-27 → FPW-08 · AC-28 → FPW-11 · AC-29 → FPW-09

No orphan scenarios and no uncovered ACs. Of the 40 scenario IDs in this plan (LGN-07 is a cross-reference note, not an independently executed scenario — 39 are actually executable):

- **20 are fully "Code-verified only — not live-walkable with the current seeded account"**: LGN-04, LGN-05 (rate limiting, CSRF/Origin), LGN-08, LGN-09, LGN-10, LGN-11 (forced password change, unverified email, 2FA), WKS-02, WKS-03, WKS-04 (Workspace Selection screen), LGN-20, LGN-21, LGN-22, LGN-23, LGN-24 (workspace-less session, multi-device, stale-workspace, token refresh), FPW-03, FPW-04, FPW-06, FPW-08, FPW-09 (forgot-password rate limiting and valid-token reset flows), FPW-11 (platform-scope isolation — different app entirely).
- **2 are partially live-grounded**: LGN-06 (Member-side RBAC nav confirmed live; Admin-side needs a second account) and WKS-05 (switcher location in the sidebar confirmed live; the actual multi-workspace switch action is code-verified only).
- **4 are flagged as reproducing an already-known, already-tracked gap rather than a new defect**: LGN-12, LGN-13, LGN-15, WKS-05.
- The remaining 14 (LGN-01, LGN-02, LGN-03, LGN-14, LGN-16, LGN-17, LGN-18, LGN-19, WKS-01, FPW-01, FPW-02, FPW-05, FPW-07, FPW-10) were either fully live-grounded this session or are simple UI/negative-logic checks not requiring special data. (Note: LGN-12, LGN-13, LGN-15, and WKS-05 appear above in the "known gap" and/or "partially live-grounded" bullets rather than repeated here, since those buckets aren't mutually exclusive with live-grounding.)
