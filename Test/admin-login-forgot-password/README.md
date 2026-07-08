# Login & Forgot Password (Admin App) — Automation (Page Object Model)

Standalone Playwright suite (outside the pnpm workspace, same convention as `Test/login-forgot-password/`). Targets the deployed Admin app directly.

Source: [../../specs/admin-login-forgot-password.md](../../specs/admin-login-forgot-password.md) (test plan) and [../../specs/admin-login-forgot-password-exploratory-results.md](../../specs/admin-login-forgot-password-exploratory-results.md) (exploratory findings).

## Setup

```bash
cd Test/admin-login-forgot-password
npm install
npx playwright install chromium
cp .env.example .env   # then fill in TEST_USER_EMAIL / TEST_USER_PASSWORD / TEST_WORKSPACE_NAME
```

`.env` is gitignored — never commit real credentials, even for a test account.

## Run

```bash
npm test
npm run test:headed
npm run report
```

## What's covered

- Tenant Owner login → `/select-context` picker → workspace dashboard, with Workspace Admin nav assertions (Billing, Exports, Team Management)
- All credential-free scenarios (wrong password, unknown email, empty-field validation, toggle, navigation)
- **DEFECT-ADM-1 regression test** (expected to fail): submitting an invalid reset token must show the AC-17 "invalid or expired" error and stay on `/reset-password` — not silently redirect to `/login?reason=session-ended` via an unwanted `/auth/refresh` attempt
- **KAN-8 cross-app checks**: re-runs the Enter-then-click double-submit repro (originally found and filed against the client app) against the admin app's Login and Reset Password forms, to determine whether the shared-component bug affects both apps

## Not covered

Same test-data gaps as the client-app suite (2FA, unverified email, forced password change), plus: a Member-role account to negatively verify role-based nav restrictions, and email inbox access for the full happy-path reset flow.
