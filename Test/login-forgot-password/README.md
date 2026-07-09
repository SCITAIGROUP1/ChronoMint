# Login & Forgot Password — Automation (Page Object Model)

Standalone Playwright suite (deliberately **outside** the pnpm workspace — see `pnpm-workspace.yaml`, which only includes `apps/*` and `packages/*`). Targets the deployed app directly; no local dev server required.

Source: [../../specs_qa/login-forgot-password.md](../../specs_qa/login-forgot-password.md) (test plan, 40 scenarios / 29 ACs) and [../../specs_qa/login-forgot-password-exploratory-results.md](../../specs_qa/login-forgot-password-exploratory-results.md) (exploratory findings that shaped these scripts, including the defect-regression tests).

> **2026-07-09 refresh:** this suite was extended to cover the full current AC-1–AC-29 scope (previously only AC-1–AC-22 under the pre-expansion numbering — comments in `login.spec.ts` have been renumbered to match: the old "LGN-15/16/17" are now LGN-13/17/18). Added `tests/workspace-session.spec.ts` (Workspace routing + session context: WKS-01, LGN-19, LGN-06 partial, WKS-05 partial, LGN-16, LGN-12, LGN-14) and `tests/logout-security.spec.ts` (LGN-40 — a brand-new regression, not in the original 40-scenario plan, for the "logout doesn't terminate the session server-side" defect found during exploratory testing). See `HEALING_LOG.md` for the run history.

## Setup

```bash
cd Test/login-forgot-password
npm install
npx playwright install chromium
cp .env.example .env   # then fill in TEST_USER_EMAIL / TEST_USER_PASSWORD
```

`.env` is gitignored — never commit real credentials, even for a test account.

## Run

```bash
npm test              # headless
npm run test:headed   # watch it run
npm run report         # open the last HTML report
```

## Structure

```
pages/                  # Page Object Model — one class per screen
  login.page.ts
  forgot-password.page.ts
  reset-password.page.ts
  dashboard.page.ts       # + workspace switcher / nav / redirect helpers
tests/
  login.spec.ts             # Login core auth + screen composition/validation
  forgot-password.spec.ts   # Forgot password + reset password
  workspace-session.spec.ts # Workspace routing + session/workspace context
  logout-security.spec.ts   # LGN-40 — new logout/session-termination regression
```

## What's covered

20 live-walkable scenarios automated (the 19 confirmed live in the 2026-07-09 exploratory
pass, plus the new LGN-40 regression):

- Login core & screen composition: LGN-01, 02, 03, 06 (partial), 12, 13, 14, 16, 17, 18
- Workspace routing & session context: WKS-01, WKS-05 (partial), LGN-19
- Forgot / reset password: FPW-01, 02, 05, 07, 10
- **LGN-40 (new)** — logout must terminate the session server-side

The 20 scenarios needing unavailable test data (2FA account, forced-password-change
account, multi-workspace account, mailbox access for real reset tokens, a second
device/browser context, the separate Platform Admin app) are **not** automated — see
the test plan's "Code-verified only — not live-walkable" bucket and `HEALING_LOG.md`.

Defect-regression tests (expected to fail until the underlying bugs are fixed — this is
intentional; they are the automated proof the defects exist and stay caught):

- `[defect regression] Enter-then-click must not double-submit /auth/login` — pre-existing, DEFECT-1
- `[defect regression] Enter-then-click must not double-submit /auth/reset-password` — pre-existing, DEFECT-1
- `[DEFECT][LGN-40] after logout, a protected route must not silently re-authenticate` — **new**, Finding 1

## Not covered (see exploratory results "Not verified — precondition unavailable" section)

2FA, unverified email, forced password change, multi-workspace, admin-role, email-inbox-dependent,
and platform-scope scenarios need test data/environments this run didn't have. Add fixtures/seed
accounts, then extend `tests/` with matching specs.
