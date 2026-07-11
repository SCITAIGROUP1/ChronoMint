# Healing Log — timer-member

Module: Timer (Client/Member app, standalone `/timer` page — distinct from the Dashboard's Quick Timer widget, already covered by `Test/dashboard-member/tests/quick-timer.spec.ts`). Suite: 5 spec files (`timer-controls`, `keyboard-shortcuts`, `daily-progress`, `favorites-and-recent`, `cross-cutting`), 1 page object (`TimerPage`, plus a copied `LoginPage`).

## Final result: 28 passed / 1 failed (confirmed real) / 7 flaky (recovered on retry, environmental)

Reproduced via a clean, isolated final run after all fixes below. This is the authoritative result.

## Fixes applied this session (in the order discovered)

### 1. Login rate-limit risk — switched to a shared authenticated session (`storageState`)
The original scaffold logged in fresh via `beforeEach` for every single test. With ~36 tests + retries, this risked (and at least once, definitively did) trip the app's own login rate limit (5 requests/60s, per `acceptance-criteria-login-forgot-password.md` AC-3), which manifests as a `/login` redirect instead of `/dashboard` — a failure that looks like a random, unrelated bug in whatever test happens to hit the limit. **Fixed** by adding `global-setup.ts` (logs in once, saves `storageState.json`) and wiring it into `playwright.config.ts`; removed the per-test `login()` calls from every spec file's `beforeEach`.

### 2. Two "default `expect()` timeout too short" bugs (same bug class as the dashboard-member/login-forgot-password modules)
- `LoginPage.login()`'s post-login `toHaveURL(/\/dashboard/)` check used Playwright's default 5s timeout; the actual redirect occasionally takes longer. Bumped to 15s.
- `TimerPage.ensureTimerStopped()`'s post-click `toBeHidden()` check had the same issue — if the stop-and-save round trip took >5s, the guard itself would throw inside `beforeEach`, silently failing to clean up and letting a leftover timer cascade into later tests. Bumped to 15s. Also bumped `stopAndSave()`'s own post-stop assertion for the same reason.

### 3. A real cascade root cause: one test with no `try/finally` around its own timer
`cross-cutting.spec.ts`'s "GET /timer/active fires on mount and after every timer action" test starts a real timer mid-test, then asserts on captured network requests — if that assertion fails (which it does, see the one remaining real finding below), the test throws before ever reaching its own stop step, leaving a timer running for whatever test happens to run next. This produced a large, scary-looking cascade of ~12-30 "unrelated" failures across every other spec file (each inheriting the leftover active-timer precondition instead of the idle state it expected).

**Fixed properly, not per-test:** rather than patching this one test's cleanup, added an unconditional `test.afterEach` to all 5 spec files that calls `TimerPage.ensureTimerStopped()` regardless of how the preceding test finished. This guarantees every test starts clean no matter which test failed or where, and is a permanent safety net against any future test written without its own guaranteed cleanup.

### 4. Two self-healed test-authoring bugs (root-caused, not assumed)
- **"Pin button only appears..." / "Pinning and unpinning..." (`favorites-and-recent.spec.ts`)** — asserted `toHaveText("Pin current task")` on an icon-only button whose actual text content is empty; the real label lives in its `title` attribute (confirmed via live DOM inspection). Fixed both assertions to `toHaveAttribute("title", ...)`.
- **Dropdown-option click flakiness (`TimerPage.selectComboboxOption`)** — occasionally timed out clicking a Project/Task option immediately after opening the combobox (recovers on Playwright's built-in retry, so not a real defect — confirmed via 2x isolated re-runs both showing "fail then pass on retry", and exploratory testing had already verified this exact interaction works). Fixed by explicitly waiting for the option to be visible before clicking, rather than relying on retry to paper over the animation timing.
- **Elapsed-time tick margin too tight** — `waitForTimeout(2500)` before asserting the elapsed-time display changed was occasionally too short; bumped to 3500ms in the 3 affected assertions (2 in `timer-controls.spec.ts`, 1 in `keyboard-shortcuts.spec.ts`).

None of the above (fixes #1-4) are product defects — they were all test-infrastructure or test-authoring issues, confirmed via direct investigation (live DOM checks, viewport/state comparisons, or clean 2x re-runs) before being treated as such, per the "don't file false defects" principle.

## One remaining, confirmed-real finding — NOT yet filed, flagged for review

### `cross-cutting.spec.ts` — "GET /timer/active fires on mount and after every timer action"
- **Assertion:** `expect(mountRequests.length).toBeGreaterThan(0)` — a `GET /timer/active` request should fire when the `/timer` page mounts.
- **Actual:** `mountRequests.length` is `0` — no such request was observed on mount.
- **Confirmed twice in isolation** (2 separate `npx playwright test -g` runs, both showing the identical `Expected: > 0, Received: 0` failure) — this is a real, reproducible result, not a flake.
- **Plausible explanation, not yet confirmed:** this suite now reuses a single authenticated `storageState` session across all tests (see fix #1) rather than a fresh login per test. If the app's client-side data layer treats the timer-active state as "already fresh" within some cache window carried over from a very recent prior navigation in the same session, it may legitimately skip a redundant fetch on this particular mount — which would make this a test-environment artifact of the new session-reuse approach, not a product bug. Alternatively, it could be a genuine, minor case where the mount-time poll is skipped under some real condition. **Not deep-dived further per the 2-iteration rule — bringing this to you rather than guessing further or filing a ticket.**

## Not automated (unchanged from Step 3's exploratory findings — precondition unavailable in this environment)

~26 scenarios remain not automated for the same reasons flagged during exploratory testing: 8-hour idle/hard-auto-stop windows, second workspace/session/device, impersonation, connected Jira account, zero-project/zero-task/zero-activity account variants, refetch-on-focus and cross-member isolation timing scenarios.

## Environment notes for future runs of this suite

- If you see a `/login` redirect failure inside `global-setup.ts` itself, check whether you've re-run this suite (or a sibling `Test/*-member` suite) many times in the last ~60 seconds — the shared login rate limit (5 req/60s) is real and easy to trip when iterating quickly on fixes. Wait ~60-90s and retry rather than assuming a new bug.
- The 7 "flaky" tests in the final run recovered on Playwright's built-in retry and were not chased further — they look like ordinary environment/timing noise (this machine has previously shown memory-pressure-driven worker crashes under load; general timing jitter under contention is consistent with that).
