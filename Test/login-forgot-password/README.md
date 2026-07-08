# Login & Forgot Password — Automation (Page Object Model)

Standalone Playwright suite (deliberately **outside** the pnpm workspace — see `pnpm-workspace.yaml`, which only includes `apps/*` and `packages/*`). Targets the deployed app directly; no local dev server required.

Source: [../../specs/login-forgot-password.md](../../specs/login-forgot-password.md) (test plan) and [../../specs/login-forgot-password-exploratory-results.md](../../specs/login-forgot-password-exploratory-results.md) (exploratory findings that shaped these scripts, including the two defect-regression tests).

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
  dashboard.page.ts
tests/
  login.spec.ts
  forgot-password.spec.ts
```

## What's covered

- All credential-free scenarios from the test plan (LGN-02, LGN-03, LGN-15, LGN-16, LGN-17, FPW-02, FPW-05, FPW-07, FPW-10)
- Credentialed scenarios (LGN-01) gated behind `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` — tests `test.skip()` if unset
- Two **defect-regression** tests encoding the bugs found in exploratory testing (Step 3):
  - `[defect regression] sign-in submits exactly once per click` — DEFECT-1
  - `[defect regression] reset submits exactly once per click` — DEFECT-1
  - `[defect regression] logout clears client access/refresh tokens from localStorage` — DEFECT-2

These three are **expected to fail** until the underlying bugs are fixed — that's intentional; they're the automated proof the defects exist and stay caught.

## Not covered (see exploratory results "Blocked" section)

2FA, unverified email, forced password change, multi-workspace, admin-role, and email-inbox-dependent scenarios need test data this run didn't have. Add fixtures/seed accounts, then extend `tests/` with matching specs.
