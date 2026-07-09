# Exploratory Test Results — Login & Forgot Password

**Module:** `login-forgot-password`
**Target application:** Client / Member app — https://chrono-mint-client.vercel.app/
**Test account:** `peter123@yopmail.com` / `Password1@` (Member role, single workspace: "Integritas")
**Executed:** 2026-07-09, via Playwright MCP (real browser, chromium)
**Test plan:** `specs_qa/login-forgot-password.md`
**Screenshots:** `specs_qa/exploratory/login-forgot-password/`

> This is a full refresh of the 2026-07-08 results file (stale — pre-expansion numbering). All 39 executable scenarios from the current plan were either driven live or explicitly marked not-verified below.

## Critical note on test environment: shared persistent browser session

The Playwright MCP browser context in this environment **persists across sessions** (it is not a fresh incognito profile per run). At the start of this session, before any action was taken, navigating directly to `/dashboard` already rendered the fully authenticated dashboard for `peter123@yopmail.com` — a valid session/refresh-token cookie was left over from the prior planning session's live exploration.

This confounded the first pass of the negative-login scenarios (LGN-02, LGN-03): a background silent-refresh raced with the failed-login submission, producing a flaky, misleading symptom (the "Invalid email or password" error would flash briefly then vanish, fields would silently clear, and network logs showed the `/auth/login` POST firing twice). Clearing cookies (`context.clearCookies()`) and rerunning the same scenarios produced clean, consistent, correct behavior. All results below reflect the **clean-cookie reruns**, which are the authoritative results. The confound itself surfaced a real, separate defect — see Finding 1 below.

---

## Findings (discrepancies discovered this session, beyond the plan's pre-flagged known gaps)

### Finding 1 — CRITICAL, NEW: "Log out" does not terminate the session server-side

**Severity: High.** Reproduced 3 times independently.

Steps:
1. Log in as `peter123@yopmail.com` (valid session established, confirmed via dashboard).
2. Click the sidebar **"Log out"** button → client redirects to `/login` and shows the sign-in form (looks correct).
3. Navigate directly to `/dashboard` (or any protected route) — even after waiting 2–7 seconds.

**Actual result:** The full authenticated dashboard renders again, with a fresh `POST /auth/refresh → 201` and `GET /users/me → 200`/`GET /auth/me → 200` succeeding using cookies that "Log out" was supposed to have invalidated. On one occurrence this even showed the "Welcome to Kloqra, Peter Sam!" first-run onboarding modal. The `DELETE /auth/logout` network call itself was observed to never resolve (no response headers/status captured, even after several seconds) in two of the three reproductions — consistent with the client not awaiting the logout call before navigating away, or an in-flight abort on route change.

**Expected result:** After logout, the refresh token should be invalidated server-side; any subsequent request to a protected route should redirect to `/login` (as it does when cookies are cleared explicitly — see LGN-16 below, which passes cleanly on a truly empty cookie jar).

**Impact:** A user who clicks "Log out" (e.g., on a shared/public machine) has not actually ended their session. Anyone with continued access to that browser can reach `/dashboard` and all protected routes without re-authenticating. This also invalidates the test plan's assumption that "Ensure signed out" (LGN-16's precondition) can be achieved via the UI's own logout button — it cannot; only clearing cookies achieved a genuinely signed-out state in this session.

**This is not one of the plan's four pre-documented "known gaps."** It should be filed as a new defect.

Evidence: `LGN-16_dashboard_after_logout_recheck.png` (dashboard + onboarding modal rendering immediately after a UI logout + fresh navigation to `/dashboard`), contrasted with `LGN-16_unauthenticated_redirect_clean.png` (correct redirect to `/login?reason=session-ended` once cookies are actually cleared).

### Finding 2 — Minor/secondary, likely related to Finding 1: failed-login error can flicker and disappear when a stale session cookie is present

Observed only while the stale-session confound (see above) was active, not on clean cookies. When submitting wrong credentials while a stale-but-still-refreshable session cookie exists, `POST /auth/login` fires **twice** for a single click, and the "Invalid email or password. Please try again." error renders very briefly then disappears with both fields silently cleared — a real user could easily miss it. On clean cookies, the exact same action produces one `/auth/login` call and a stable, persistent error message (see LGN-02/LGN-03 below).

Given Finding 1 (logout leaves a stale-but-valid refresh cookie behind), this is a plausible real-world combination: a user logs out, the session isn't actually killed, they later mistype their password logging back in, and the error message may flicker/vanish rather than staying visible — likely an interceptor that retries the original request after a silent-refresh attempt, applied too broadly (including to the login endpoint itself). Recommend filing alongside Finding 1 since the two are probably related; not independently re-verified beyond this session's observations.

### Finding 3 — Minor, informational: field label wording differs slightly from the plan's own notes

The plan's LGN-12 description says "Email Address field"; the live label (and accessible name) is simply **"Email"**. Not a defect (no AC specifies literal label text), just a note for whoever automates selectors next — use `getByRole('textbox', { name: 'Email' })`, not "Email Address".

---

## Results by scenario

### 1. Login — Core Authentication

| ID | Result | Notes |
|---|---|---|
| LGN-01 | **PASS** | Valid credentials → redirected to `/dashboard`; single `POST /auth/login → 201`; sidebar shows Integritas/Member. Screenshot: `LGN-01_successful_login_dashboard.png` |
| LGN-02 | **PASS** (clean rerun) | Wrong password → "Invalid email or password. Please try again." shown inline, persists, fields retain values; single `401`. First attempt (stale session present) was flaky/misleading — see Finding 2. Screenshot: `LGN-02_clean_1s.png` |
| LGN-03 | **PASS** (clean rerun) | Unknown email → identical message/behavior to LGN-02, confirming no enumeration. Screenshot: `LGN-03_clean_confirmed.png` |
| LGN-04 | Not verified — precondition unavailable (rate limiting against shared production endpoint; per task instructions, not hammered) | |
| LGN-05 | Not verified — precondition unavailable (server-side Origin/CSRF check not triggerable from browser UI) | |
| LGN-06 | **PASS (partial, Member side only)** | Confirmed live: Member nav = Dashboard, Timer, Time Tracker, Timesheet, Submissions, Notifications, My projects — no billing/project-CRUD/export-wizard items. Admin-side comparison not verified (no TD-6 account). Screenshot: `LGN-19_WKS-01_dashboard_workspace_context.png` |
| LGN-07 | Not independently executed (cross-reference note only, per plan) | |

### 2. Login — Special Account States

| ID | Result | Notes |
|---|---|---|
| LGN-08 | Not verified — precondition unavailable (no TD-2 mustChangePassword account) | |
| LGN-09 | Not verified — precondition unavailable (no TD-3 unverified-email account) | |
| LGN-10 | Not verified — precondition unavailable (no TD-4 2FA account) | |
| LGN-11 | Not verified — precondition unavailable (no TD-4 2FA account) | |

### 3. Login — Screen Composition & Validation

| ID | Result | Notes |
|---|---|---|
| LGN-12 | **PASS — confirms known gap, reproduces exactly as documented** | Button reads "Sign in" not "Login". Label is "Email" (not "Email Address" as the plan's own notes said — minor plan inaccuracy, not a product defect). Screenshot: `LGN-12_login_screen.png` |
| LGN-13 | **PASS — confirms known gap, reproduces exactly as documented** | "Email is required" / "Password is required" shown per-field; confirmed no `POST /auth/login` fired. Screenshot: `LGN-13_empty_submit_validation.png` |
| LGN-14 | **PASS** | Email filled, Password blank → only "Password is required" shown, no API call. Screenshot: `LGN-14_partial_empty_submit.png` |
| LGN-15 | **PASS — confirms known gap, reproduces exactly as documented** | After a live login, navigating to `/login` re-renders the full sign-in form instead of redirecting to `/dashboard`. Reproduced twice independently. Screenshot: `LGN-15_authenticated_user_login_page.png` |
| LGN-16 | **PASS (on truly clean/unauthenticated state)** | With cookies cleared, `/dashboard` correctly redirects to `/login?reason=session-ended`. Note: this scenario's precondition ("ensure signed out") could **not** be reliably achieved via the UI's own "Log out" button — see Finding 1. Screenshot: `LGN-16_unauthenticated_redirect_clean.png` |
| LGN-17 | **PASS** | Show/hide password toggle: masked → plain text → re-masked, confirmed via before/after screenshots and accessible-name change ("Show password" ↔ "Hide password"). Screenshots: `LGN-17a_password_masked.png`, `LGN-17b_password_visible.png` |
| LGN-18 | **PASS** | "Forgot password?" navigates to `/forgot-password`. Screenshot: `LGN-18_forgot_password_nav.png` |

### 4. Post-Login Workspace Routing & Workspace Selection

| ID | Result | Notes |
|---|---|---|
| WKS-01 | **PASS** | Single-workspace login lands directly on `/dashboard`, no Workspace Selection screen. Screenshot: `LGN-19_WKS-01_dashboard_workspace_context.png` |
| WKS-02 | Not verified — precondition unavailable (no TD-5 multi-workspace account) | |
| WKS-03 | Not verified — precondition unavailable (no TD-5 multi-workspace account) | |
| WKS-04 | Not verified — precondition unavailable (no TD-5 multi-workspace account) | |
| WKS-05 | **PASS — confirms known gap (placement), switch action not verified** | Clicking the sidebar "Integritas Member" button opens a "Switch context" listbox with a search box and the current workspace shown as a selected option — confirms the switcher lives in the left sidebar, not top nav. Multi-workspace switch action itself remains not verified (no TD-5). Screenshot: `WKS-05_workspace_switcher_dropdown.png` |

### 5. Session & Workspace Context

| ID | Result | Notes |
|---|---|---|
| LGN-19 | **PASS** | Sidebar shows "Integritas" / "Member" matching the account's single membership. Screenshot: `LGN-19_WKS-01_dashboard_workspace_context.png` |
| LGN-20 | Not verified — precondition unavailable (no TD-8 workspace-less account) | |
| LGN-21 | Not verified — precondition unavailable (no second device/browser-profile context) | |
| LGN-22 | Not verified — precondition unavailable (no TD-5 + second device context) | |
| LGN-23 | Not verified — precondition unavailable (cannot safely force/wait out access-token expiry) | |
| LGN-24 | Not verified — precondition unavailable (no concurrent-request timing control via browser UI) | |

### 6. Forgot Password — Request Reset Link

| ID | Result | Notes |
|---|---|---|
| FPW-01 | **PASS** | Registered email → "If an account exists for that email, we sent a password reset link." Screenshot: `FPW-01_registered_email_response.png` |
| FPW-02 | **PASS** | Unregistered/fabricated email → identical message, no enumeration. Screenshot: `FPW-02_unregistered_email_response.png` |
| FPW-03 | Not verified — precondition unavailable (rate limiting against shared production endpoint, not hammered per task instructions) | |

### 7. Forgot Password — Reset Password

| ID | Result | Notes |
|---|---|---|
| FPW-04 | Not verified — precondition unavailable (no mailbox access to retrieve a real token) | |
| FPW-05 | **PASS** | `/reset-password?token=<fabricated>` + policy-valid new password → `POST /auth/reset-password → 401`; inline error **"Password reset link is invalid or expired"** shown; password not changed, no redirect. (First observation attempt raced a screenshot before the response landed and showed no error yet — a timing artifact of the test tool, not the app; a proper capture confirms the error renders reliably.) Screenshot: `FPW-05_invalid_token_401_immediate.png` |
| FPW-06 | Not verified — precondition unavailable (depends on FPW-04 completing with a real token) | |
| FPW-07 | **PASS** | Typing `weak` triggers inline "Weak" strength indicator; submitting is blocked client-side (no network request fires). Screenshot: `FPW-07_weak_password_indicator.png` |
| FPW-08 | Not verified — precondition unavailable (rate limiting against shared production endpoint) | |
| FPW-09 | Not verified — precondition unavailable (depends on FPW-04 completing with a real token) | |
| FPW-10 | **PASS** | "Back to sign in" navigates to `/login`. (Screenshot not separately captured; confirmed via navigation snapshot.) |

### 8. Forgot Password — Platform Scope Isolation

| ID | Result | Notes |
|---|---|---|
| FPW-11 | Not verified — precondition unavailable (belongs to the separate Platform Admin app, out of this plan's target URL) | |

---

## Summary

- **Total scenario IDs in plan:** 40 (LGN-07 is a cross-reference note, not independently executed → 39 executable)
- **Executed live this session:** 19 distinct scenarios (LGN-01, 02, 03, 06(partial), 12, 13, 14, 15, 16, 17, 18, 19, WKS-01, WKS-05(partial), FPW-01, 02, 05, 07, 10); LGN-06 and WKS-05 are each partially live / partially not-verified
- **Not verified — precondition unavailable:** 20 (LGN-04, 05, 08, 09, 10, 11, WKS-02, 03, 04, LGN-20, 21, 22, 23, 24, FPW-03, 04, 06, 08, 09, 11)
- **Pass:** 19 of 19 executed scenarios passed against actual (not necessarily literal-AC) expected behavior, including 4 that correctly reproduced the plan's pre-documented "known gaps" (LGN-12, LGN-13, LGN-15, WKS-05) exactly as described — none of the four known gaps had silently regressed further or been unexpectedly fixed.
- **Fail:** 0 scenarios failed in the pass/fail sense used by the plan (no scenario contradicted its own expected result once retested under clean conditions).
- **New discrepancies found (not previously documented):**
  1. **Critical:** "Log out" does not terminate the session server-side — a fresh `/auth/refresh` silently re-authenticates the user on the very next protected-route visit. This also means LGN-16's "ensure signed out" precondition cannot be achieved via the app's own UI; only clearing cookies achieved a true signed-out state. Recommend filing as a new, high-severity defect.
  2. **Minor:** failed-login error message can flicker and vanish when a stale-but-refreshable session cookie is present (likely a consequence of #1's stale sessions combined with an over-broad refresh-and-retry interceptor). Recommend filing alongside #1.
  3. **Informational:** the test plan's own notes call the login screen's field "Email Address"; the live accessible name is "Email" — cosmetic note for automation, not a product defect.

## Environment lesson for future runs

This Playwright MCP browser context persists cookies across sessions/runs against the shared production app. Future exploratory or automated runs against this app should explicitly clear cookies (`context.clearCookies()`) before any scenario that depends on being in a genuinely unauthenticated state (LGN-02, LGN-03, LGN-16, and anything gated on "signed out"), rather than relying on the UI's own logout action, given Finding 1.
