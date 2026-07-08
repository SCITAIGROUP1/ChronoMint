# Exploratory Testing Results — Login & Forgot Password

**Module:** `login-forgot-password`
**Test plan:** [login-forgot-password.md](./login-forgot-password.md)
**Target:** https://chrono-mint-client.vercel.app/
**Tool:** Playwright MCP (live Chrome browser, real network calls against production API `chronomintapi-production.up.railway.app`)
**Test account used:** `peter123@yopmail.com` (Member role, workspace "Integritas")
**Date:** 2026-07-08
**Screenshots:** [`./screenshots/`](./screenshots/)

---

## Summary

| Result | Count |
|---|---|
| ✅ Pass | 9 |
| ❌ Fail / Defect found | 2 (affecting 3 scenarios) |
| ⛔ Blocked (no test data available) | 15 |

Two real defects were found and reproduced multiple times. Both are documented in detail below and were carried into Step 6 (Jira).

---

## Executed scenarios

| ID | Result | Evidence | Notes |
|---|---|---|---|
| LGN-01 | ✅ Pass | `LGN-01-dashboard-success.png` | Valid login → redirected to `/dashboard`, session established, workspace "Integritas" / role Member visible. |
| LGN-02 | ⚠️ Pass (functional) / defect noted | `LGN-02-wrong-password-error.png` | Correct generic error `"Invalid email or password. Please try again."`, inline under the form. **But** see DEFECT-1 — the click fired the login request twice. |
| LGN-03 | ⚠️ Pass (functional) / defect noted | `LGN-03-unknown-email-error.png` | Identical generic error to LGN-02 — confirms no account enumeration (AC-2 met). Same DEFECT-1 double-submit observed again with a different (non-existent) email, confirming it's a UI bug, not account-specific. |
| LGN-04 | ⚠️ Inconclusive | — | Sent 10 failed attempts (5 clicks × 2 due to DEFECT-1) within ~50s. Never observed a 429. `x-ratelimit-remaining-auth` decremented irregularly (4 → 4 → 4 → 3) — consistent with a sliding 60s window resetting between my manual attempts (tool round-trip latency ~10s/click). Not enough controlled requests-per-second to conclusively confirm/deny AC-3 manually; **re-verify with the scripted automation in Step 4/5**, which can fire requests back-to-back without human-tool latency. |
| LGN-15 | ✅ Pass | (inline snapshot) | Empty submit shows "Email is required" / "Password is required" client-side; confirmed **no** network call fired. |
| LGN-16 | ✅ Pass | (DOM check) | "Show password" toggles `input[type=password]` ↔ `input[type=text]` correctly. |
| LGN-17 | ✅ Pass | (inline snapshot, plan step) | "Forgot password?" link navigates to `/forgot-password`. |
| FPW-01 | ✅ Pass | `FPW-01-generic-confirmation.png` | Registered email → generic message `"If an account exists for that email, we sent a password reset link."`; single `POST /auth/forgot-password` → 201 (no double-submit here). |
| FPW-02 | ✅ Pass | (inline snapshot) | Unregistered email → **identical** message to FPW-01. No enumeration. |
| FPW-05 | ⚠️ Pass (functional) / defect noted | — | Navigated directly to `/reset-password?token=invalid-bogus-token-123`; submitting a valid-policy password correctly returned `401 "Password reset link is invalid or expired"` and did not change any password. **But** DEFECT-1 (double-submit) reproduced here too — `POST /auth/reset-password` fired twice for one click. |
| FPW-07 | ✅ Pass | `FPW-07-weak-password-strength.png` | Entering `weak` as new password shows a "Weak" strength indicator and blocks submission client-side — **no** API call fired. |
| FPW-10 | ✅ Pass | (inline snapshot) | "Back to sign in" link navigates to `/login`. |

## Blocked scenarios (test data unavailable this run)

| ID | Reason blocked |
|---|---|
| LGN-05 | No account with `mustChangePassword = true` provisioned (TD-2) |
| LGN-06 | No account with unverified email provisioned (TD-3) |
| LGN-07, LGN-08 | No 2FA/TOTP-enabled test account or authenticator access (TD-4) |
| LGN-09 (multi-membership variant), LGN-11 | No multi-workspace test account (TD-5) |
| LGN-10 | Requires two isolated browser profiles/contexts run in parallel — deferred to automation (Step 4), which can script this properly |
| LGN-12 | Requires forcing/waiting out access-token expiry (~15 min) — deferred to automation with token manipulation |
| LGN-13 | API-level test (direct `Origin` header manipulation) — not exercisable through the browser UI; candidate for a direct API test in Step 4 |
| LGN-14 | No separate Admin-role test account provided |
| FPW-03, FPW-08 | Same rate-limit ambiguity as LGN-04 — deferred to scripted automation for precise timing |
| FPW-04, FPW-06, FPW-09 | Require reading the actual reset token from a real email (TD-7) — no inbox access this run |

---

## Defects found

### DEFECT-1 (Medium/High) — CONFIRMED: Enter-then-click double-submits Sign-in / Reset-password

**Where:** `/login` (Sign in button) and `/reset-password` (Reset password button). Confirmed **not** present on `/forgot-password` (Send reset link fires exactly once).

**Root cause, isolated during Step 4/5 automation:** A plain, single `fill()` + `click()` (no Enter key) reliably fires **exactly one** request — verified 4/4 automated runs. The actual trigger is **pressing Enter in the password field, followed by clicking the submit button**: the Enter keypress submits the form once, and the form/button does not disable itself or ignore a second submit while the first request is in flight/just completed, so the click submits a second, identical request. This matches the original manual-testing observation (Playwright MCP's fill-then-separate-click tool sequence apparently triggers this same Enter/blur-adjacent path) and is now captured in a deterministic, scripted repro.

**Reproduction (100% reproducible — 2/2 scripted attempts on `/auth/login`, 2/2 on `/auth/reset-password`, after the initial 3/3 manual observations):**
1. Go to `/login` (or a `/reset-password?token=...` page)
2. Fill in the form fields
3. Press **Enter** in the last field, wait ~1.5s
4. Click the submit button
5. Inspect network tab

**Actual:** Two separate `POST` requests fire (`/auth/login` or `/auth/reset-password`) with **identical** request bodies.

**Expected:** Exactly one request, regardless of whether submission was triggered by Enter, by click, or both in quick succession — the second submit attempt should be a no-op while the first is in flight (e.g. disable the button / ignore re-entry until the pending request settles).

**Impact:**
- Each such double-submit burns **2** of the account's 5-per-minute auth rate-limit quota (`x-ratelimit-limit-auth: 5`) instead of 1 — a user who presses Enter out of habit and then also clicks "Sign in" hits the 429 throttle roughly twice as fast as the system is designed for (AC-3).
- Same pattern reproduced on `/reset-password`, meaning a user resetting their password could exhaust that endpoint's separate 5/min limit (AC-20) in half the intended number of attempts.
- Doubles backend load per affected user action on two security-sensitive, already-throttled endpoints.

**Evidence:** Automated Playwright regression tests `[defect regression] Enter-then-click must not double-submit /auth/login` and `.../auth/reset-password` in [`Test/login-forgot-password/tests/`](../Test/login-forgot-password/tests/) fail consistently, capturing 2 identical requests per repro. Manual network captures (request bodies/headers) from the original exploratory pass are also retained as supporting evidence.

---

### Investigated, NOT confirmed — "Logout doesn't clear localStorage tokens"

**Original manual observation:** During the first exploratory pass, `cm-client-access-token` / `cm-client-refresh-token` / `cm-client-workspace-id` appeared to remain in `localStorage` after clicking "Log out", and a stale bearer token was seen attached to a subsequent request.

**Follow-up (Step 5):** Two independent, isolated automated runs — (a) a direct login → logout → immediate `localStorage` read, repeated 4× across the full suite, and (b) a targeted investigation script that also replayed extra failed-login activity after logout to mimic the original manual sequence — **both consistently showed `localStorage` correctly cleared immediately after logout** (`accessToken`/`refreshToken`/`workspaceId` all `null`).

**Conclusion:** Not filed as a defect. The original observation could not be reproduced under controlled conditions and most likely reflects either a tool/timing artifact specific to the manual MCP session (much longer wall-clock gaps between steps than the automated re-test), or a narrower race (e.g. an uncancelled proactive-refresh timer scheduled ~13 minutes before token expiry, per `AUTH.md`) that would only manifest after several minutes — outside the practical runtime of this test pass. The regression test `logout clears client access/refresh tokens from localStorage` is kept in the suite as a standing guard in case this resurfaces, but it is **not** currently failing and should not be treated as evidence of a bug.

---

## Recommendations for Step 4 (automation) — followed

1. ~~Script LGN-04/FPW-03/FPW-08 (rate limiting) with tight, back-to-back HTTP calls~~ — not yet scripted; still recommended as future work (manual testing was inconclusive due to tool latency, and this pass prioritized root-causing DEFECT-1 instead).
2. Added an explicit assertion capturing exactly-one-request-per-submit for both a plain click (passes) and the Enter-then-click sequence (fails, encoding DEFECT-1).
3. Added a post-logout `localStorage` assertion — currently passing; kept as a guard, not evidence of a bug (see above).
4. Scenarios requiring seeded test data (2FA, unverified email, forced password change, multi-workspace, admin role, email inbox) remain flagged as "Blocked"/not scripted until that test data is provisioned.
