# Healing Log — login-forgot-password

Module: Login & Forgot Password (Client/Member app). Suite: 24 tests across 4 spec files (`login.spec.ts`, `forgot-password.spec.ts`, `logout-security.spec.ts`, `workspace-session.spec.ts`), built on 4 page objects (`login.page.ts`, `forgot-password.page.ts`, `reset-password.page.ts`, `dashboard.page.ts`).

## Run history

**Run 1 (automation subagent, first attempt):** 6 passed, 4 failed, 14 did not run. All 4 failures were `Error: worker process exited unexpectedly (code=3221225794, signal=null)` — a Windows access-violation crash of the Playwright worker process itself, not a test assertion failure.

**Root cause investigation:** system memory was critically low during this run (`wmic OS get FreePhysicalMemory` showed ~2.1–3.3GB free out of 16GB total, with a large number of concurrent `chrome.exe` processes already running on the machine outside of this test run). `playwright.config.ts` already uses `workers: 1` and `fullyParallel: false`, so this was not a parallelism problem — it was host-level memory pressure crashing the Chromium-driving worker process mid-test. This is an **environment/resource issue, not a product or test-authoring defect.**

**Run 2 (automation subagent retry):** hung — the background task produced zero output for several minutes and was abandoned. Not counted as a real result.

**Run 3 (isolated re-runs, executed directly to get clean signal without further piling load onto the memory-constrained host):**
- `logout-security.spec.ts` (LGN-40) — ran cleanly, **failed on a real assertion** (see Confirmed defects below).
- `login.spec.ts` › "successful login ... redirects to dashboard" — ran cleanly, **passed**. (Run 1's failure here was purely the worker crash — a false negative.)
- `workspace-session.spec.ts` › "single-workspace member bypasses Workspace Selection" — ran cleanly, **passed**. (Same — Run 1's failure was a false negative from the crash.)
- `forgot-password.spec.ts` › "[defect regression] Enter-then-click must not double-submit /auth/reset-password" — ran cleanly (no crash) but **timed out** waiting for the "Reset password" button. See "Test-design gap, not filed" below — this is NOT self-healed, because it isn't a selector/timing problem; it needs the test rewritten.

**Run 4 (full suite, all 24 tests, after confirming the crashes were transient):** completed cleanly in one pass, no crashes. **21 passed, 3 failed.** This is the authoritative final result.

## Final result: 21 passed / 3 failed (of 24)

## Confirmed real defects (left red — NOT self-healed)

### 1. `logout-security.spec.ts:33` — [DEFECT][LGN-40] Logout does not terminate the session server-side
- **Assertion:** after logout, navigating to a protected route (`/dashboard`) must redirect to `/login`.
- **Actual:** the browser lands back on `https://chrono-mint-client.vercel.app/dashboard` — a background `POST /auth/refresh` fires and silently re-authenticates the session.
- **Origin:** first surfaced during exploratory testing (Step 3), reproduced 3 independent times manually; now reproduced a 4th time via automation.
- **Severity assessment:** security-relevant — a "logged out" session remains resumable without re-entering credentials. Recommend Critical/High severity.

### 2. `login.spec.ts:122` — [defect regression] Enter-then-click double-submits `/auth/login`
- **Assertion:** pressing Enter in the password field then clicking "Sign in" should fire exactly one `/auth/login` request.
- **Actual:** two distinct `/auth/login` requests fire (captured as two separate request objects).
- **Cross-reference:** this re-confirms `KAN-8` (filed 2026-07-08, still open/Backlog) — the Login form's Enter-then-click double-submit is unchanged and still valid. The sibling test `forgot-password.spec.ts:78` was written expecting the Reset Password form to share this same bug, but instead surfaced a different, unresolved discrepancy — see item 3 below.

## Confirmed, but with an unresolved discrepancy vs. the original bug report — flagged, not silently resolved

### 3. `forgot-password.spec.ts:78` — Enter-submit on reset-password with an invalid token
- **Symptom:** `resetPasswordButton.click({ force: true })` times out after 45s waiting to locate the "Reset password" button, following an `Enter` keypress in the confirm-password field. Reproduced identically on 2 separate automated runs (not a one-off crash/flake).
- **Root cause, confirmed via the failure screenshot (`test-results/forgot-password-Reset-pass-.../test-failed-1.png`):** the automated browser is not still on `/reset-password` at all — it has been redirected to `/login` ("Sign in" screen). The "Reset password" button genuinely no longer exists on the page, which is exactly why the locator times out; this is not a selector problem.
- **This contradicts the existing bug report KAN-8** (filed 2026-07-08, still open/Backlog), which describes the Enter-then-click sequence on this same form as producing two identical `POST /auth/reset-password` requests with an inline "Password reset link is invalid or expired" error staying on the page — i.e. no redirect at all. I independently re-drove this exact flow manually via Playwright MCP this session and did reproduce KAN-8's original description (stayed on `/reset-password`, inline error shown, button still present) — but the actual isolated automated test, run twice, consistently shows the redirect-to-`/login` behavior instead.
- **Not silently resolved either way.** Two genuinely different behaviors have now been observed for what should be the same interaction, by two different methods, and there isn't enough information to confidently say which is "the bug" and which is stale — possibilities include a real product change since 2026-07-08 that introduced the redirect (in which case KAN-8's description is now stale and this is arguably a new, likely worse regression — an Enter-key submission may be silently ejecting the user from the recovery flow entirely instead of just double-submitting), or a session/cookie-state difference between a fresh isolated browser context (automation) and an already-used interactive one (manual) that happens to route differently. Recommend a human re-verify this specific case (Enter key, invalid token, freshly cleared cookies) before deciding whether to update KAN-8 or file a new ticket.

## Not automated (unchanged from Step 3's exploratory findings — precondition unavailable in this environment)

20 of the 40 planned scenarios remain "not verified" for the same reasons flagged during exploratory testing: no seeded 2FA-enabled account, no forced-password-change account, no unverified-email account, no second workspace membership for this test user, no mailbox access for real reset tokens, no multi-device/second-browser-context setup, and the platform-scope isolation scenario belongs to a different app entirely (Platform Admin, out of this module's environment). These were not attempted in automation for the same reason they weren't live-walkable in Step 3 — the environment cannot produce the precondition, not a test-authoring gap.

## Environment note for future runs of this suite

If workers crash with `code=3221225794` (Windows access violation) again, check free system memory first (`wmic OS get FreePhysicalMemory,TotalVisibleMemorySize`) before assuming a product or test defect — this run showed the crash disappears entirely once the host has more headroom, with the exact same test code and config.
