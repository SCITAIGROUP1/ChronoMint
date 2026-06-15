# QA evidence policy

Where proof of testing lives, what to attach, and how to name it.

**Rule:** GitHub is the **system of record**. Local files are scratch until you attach them to an issue or PR comment.

Related: [QA_ENGINEER_GUIDE.md](QA_ENGINEER_GUIDE.md) · [BUG_TRIAGE.md](BUG_TRIAGE.md)

---

## Evidence map (where things live)

| Kind                       | Stored where                             | Retention                    | Who creates              |
| -------------------------- | ---------------------------------------- | ---------------------------- | ------------------------ |
| **QA sign-off**            | GitHub **issue comment**                 | Permanent                    | QA engineer              |
| **Screenshots / video**    | GitHub issue/PR **attachments**          | Permanent                    | QA engineer              |
| **Release sign-off**       | GitHub **release PR comment**            | Permanent                    | QA engineer              |
| **CI pass/fail**           | PR **Checks** tab                        | While PR exists              | GitHub Actions           |
| **CI artifacts**           | Actions run → **Artifacts**              | **7 days**                   | GitHub Actions           |
| **Local test reports**     | Repo folders (gitignored)                | Until next test run          | `pnpm test` / Playwright |
| **Optional evidence pack** | `.qa-evidence/GH-<issue#>/` (gitignored) | Local — you delete when done | QA engineer              |

---

## Per-issue evidence (required)

Before moving a card to **`done`**, the issue must have:

1. **Sign-off comment** — use `print-signoff.mjs` or [issue-signoff template](../../.cursor/skills/kloqra-qa-workflow/templates/issue-signoff.md)
2. **Every AC row** filled with PASS/FAIL + evidence pointer
3. **Matrix** rows marked `[x]` on the issue body (or “matrix checked in sign-off” in comment)
4. **CI link** — URL to green PR Checks or workflow run
5. **Attachments** — per table below

### Required evidence by AC type

| Matrix type    | Minimum evidence in sign-off                                                           |
| -------------- | -------------------------------------------------------------------------------------- |
| **Unit**       | Command + `PASS` line count, e.g. `pnpm --filter @kloqra/api test presence` → 3 passed |
| **API**        | Command + status codes, e.g. `workspace.e2e.ts` → PATCH 200, body keys whitelist       |
| **E2E**        | Playwright spec name + CI green, or local `test:e2e` output snippet                    |
| **Contract**   | Spec file + `pnpm --filter @kloqra/contracts test` pass                                |
| **Manual**     | Numbered steps done + **screenshot** if UI (required for UI changes)                   |
| **Regression** | Full suite command + pass count                                                        |

### UI / manual screenshot rule

Attach a screenshot when the AC is about:

- Layout, labels, buttons, toasts, errors
- Downloaded files (show filename or open CSV snippet)
- Redirects (address bar showing `/login`)

**Not required** for pure API/unit-only stories with no UI matrix rows.

---

## Naming convention (attachments)

Use this pattern when uploading to GitHub:

```text
GH-<issue#>-<AC-id>-<short-label>.<ext>
```

Examples:

| Filename                         | When                                |
| -------------------------------- | ----------------------------------- |
| `GH-199-AC-1-export-csv.png`     | CSV export success                  |
| `GH-199-AC-2-empty-toast.png`    | “No entries to export” toast        |
| `GH-199-AC-3-login-redirect.png` | Unauthenticated redirect            |
| `GH-200-AC-1-patch-response.png` | API response in DevTools (optional) |

For **failures** (`qa-failed`):

```text
GH-<issue#>-AC-<n>-FAIL-<short-label>.png
```

Videos: same pattern with `.mp4` or `.webm`.

---

## Sign-off comment template (with evidence links)

```text
QA sign-off GH-199
Environment: local — http://localhost:3000
Tester: Alex — 2026-06-15

| AC | Result | Evidence |
|----|--------|----------|
| AC-1 | PASS | `timesheet.spec.ts` AC-1; screenshot GH-199-AC-1-export-csv.png |
| AC-2 | PASS | `timesheet.spec.ts` AC-2; screenshot GH-199-AC-2-empty-toast.png |
| AC-3 | PASS | `smoke.spec.ts`; screenshot GH-199-AC-3-login-redirect.png |
| Regression | PASS | `pnpm --filter @kloqra/client test:e2e timesheet` — all green |

Gate: CI green — https://github.com/SCITAIGROUP1/ChronoMint/pull/___
Matrix: all rows [x]
```

Generate scaffold:

```bash
node .cursor/skills/kloqra-qa-workflow/scripts/print-signoff.mjs 199 --env local --acs 3
```

---

## Automated evidence (CI)

### On the PR (preferred)

Link in sign-off:

```text
CI: https://github.com/SCITAIGROUP1/ChronoMint/actions/runs/<run-id>
PR Checks: https://github.com/SCITAIGROUP1/ChronoMint/pull/<num>/checks
```

### Download before expiry (7 days)

GitHub → **Actions** → workflow run → **Artifacts**:

| Artifact                           | Use for                                   |
| ---------------------------------- | ----------------------------------------- |
| `playwright-report`                | Failed browser steps, screenshots, traces |
| `coverage`                         | Coverage HTML                             |
| `unit-junit` / `integration-junit` | Which test failed                         |

### Local automated reports (after you run tests)

| Report            | Open at                                                |
| ----------------- | ------------------------------------------------------ |
| Test hub          | `corepack pnpm test:dashboard` → http://localhost:9321 |
| Client Playwright | `apps/client/playwright-report/index.html`             |
| Admin Playwright  | `apps/admin/playwright-report/index.html`              |
| API coverage      | `apps/api/coverage/index.html`                         |

These folders are **gitignored** — copy screenshots into GitHub issue attachments before they are overwritten by the next run.

---

## Optional local evidence pack

Use when you want one folder per issue before uploading to GitHub.

```bash
node .cursor/skills/kloqra-qa-workflow/scripts/archive-evidence.mjs 199 --env local
```

Creates:

```text
.qa-evidence/GH-199/
  manifest.json          # issue, date, tester, environment
  SIGNOFF.md             # paste-ready sign-off stub
  screenshots/           # you drop renamed PNGs here
  playwright/            # copy of latest client report (if --copy-playwright)
```

Folder is **gitignored** — never commit `.qa-evidence/` to the repo.

---

## Release evidence (staging)

Post on the **release PR** (not only on issues):

| Item                  | Evidence                                      |
| --------------------- | --------------------------------------------- |
| Client smoke (7 rows) | PASS/FAIL per row in comment                  |
| Admin smoke (8 rows)  | PASS/FAIL per row                             |
| Staging URLs          | From [ENVIRONMENTS.md](ENVIRONMENTS.md)       |
| Sprint issues         | List `GH-___ done`                            |
| Screenshots           | Optional: one per app showing login/dashboard |

Template: [release-signoff.md](../../.cursor/skills/kloqra-qa-workflow/templates/release-signoff.md)

---

## Bug evidence

When filing [Bug issues](https://github.com/SCITAIGROUP1/ChronoMint/issues/new?template=bug.yml):

| Field                 | Evidence                     |
| --------------------- | ---------------------------- |
| Steps                 | Numbered repro               |
| Expected vs actual    | Text                         |
| Environment           | local / staging / production |
| Screenshot            | Required for UI bugs         |
| Fix verification AC-1 | How QA will retest after fix |

Failures on a story: comment `AC-N FAIL` on the **story** + attach `GH-<issue#>-AC-N-FAIL-*.png`.

---

## What NOT to do

| Don't                                            | Why                                      |
| ------------------------------------------------ | ---------------------------------------- |
| Commit screenshots to `docs/qa/evidence/` in git | Blobs in repo; use GitHub attachments    |
| Sign off without CI link when a PR exists        | No audit trail                           |
| Mark `done` with only “tested OK”                | Must cite AC-IDs                         |
| Rely on local Playwright reports after 7+ days   | Overwritten locally; CI artifacts expire |

---

## Quick checklist before `done`

```text
[ ] Sign-off comment on issue GH-___
[ ] Each AC: PASS/FAIL + evidence (command, link, or screenshot name)
[ ] UI ACs: screenshot attached with GH-___-AC-_-*.png name
[ ] CI / PR link in sign-off
[ ] Matrix [x] on issue
[ ] Project #4 card → done
```
