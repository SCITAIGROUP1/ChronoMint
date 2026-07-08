# QA End-to-End Workflow (Reusable Playbook)

A repeatable, natural-language QA workflow that takes a feature from **user story → test plan → exploratory testing → automation → self-healing execution → defect logging → report → commit**, driven entirely through chat with MCP-connected tools (Playwright MCP for browser automation, Atlassian/Jira MCP for defect logging, GitHub MCP for version control).

Copy this file's steps into a prompt and fill in the placeholders (`{{...}}`) for any module you want to test — Login, Forgot Password, Timer, Billing, etc.

---

## Prerequisites (check before running)

| Requirement | Purpose | Check with |
|---|---|---|
| **GitHub MCP** | Step 8 commit/push | `claude mcp list` → `github: ... Connected` |
| **Playwright MCP** | Step 3 exploratory testing (live browser driving) | `claude mcp list` → `playwright: ... Connected` |
| **Atlassian/Jira MCP** | Step 6 defect ticket creation | `claude mcp list` → `atlassian` (or `jira`) `... Connected` |
| App is reachable | Steps 3–5 need a running target (local dev server or deployed URL) | Confirm `{{app_base_url}}` loads |
| Test credentials | Login-gated flows need a real account | Confirm `{{test_username}}` / `{{test_password}}` are valid, non-production data |

If a required MCP server isn't connected, set it up first (`claude mcp add ...`) rather than skipping the step silently.

---

## Parameters to fill in per run

| Placeholder | Example | Notes |
|---|---|---|
| `{{module_name}}` | `login-forgot-password` | Used in folder/file names — kebab-case, no spaces |
| `{{user_story_path}}` | `docs/qa/acceptance-criteria-login-forgot-password.md` | Source of truth for scope — can be a single file or a folder |
| `{{app_base_url}}` | `http://localhost:3000` | Client app; use a second URL if admin app is in scope |
| `{{test_username}}` / `{{test_password}}` | seeded test account | Never use real customer credentials |
| `{{jira_project_url}}` | `https://kloqra.atlassian.net/jira/software/projects/KAN/boards/1` | Target board for defects |
| `{{jira_label}}` | `AI_Generated` | Created if it doesn't exist, applied to every ticket from this run |
| `{{qa_root}}` | repo root (default) | Base directory for `specs/`, `Test/`, `Test_Results/` — override if the team wants everything under `docs/qa/` instead |

---

## Step 1 — Read the user story

Read `{{user_story_path}}`. Summarize in a few sentences:
- What feature/flow is in scope
- Which acceptance criteria exist (list IDs if the source doc has them)
- Any explicit out-of-scope items (don't invent tests for things marked "not implemented")

**Output:** short summary posted in chat — no file yet.

---

## Step 2 — Create the test plan

From the user story + acceptance criteria, and by exploring the actual application at `{{app_base_url}}` (so scenarios reference real screens/fields, not guesses):

- Cover every acceptance criterion with at least one scenario (positive, negative, and edge cases)
- Use a consistent scenario format: `ID | Title | Preconditions | Steps | Expected Result | Priority`
- Group by feature area (e.g., Login, Forgot Password)
- Flag anything that needs a specific data setup (e.g., unverified email account, 2FA-enabled account)

**Save as:** `{{qa_root}}/specs/{{module_name}}.md`

---

## Step 3 — Exploratory testing (manual, via Playwright MCP)

Read the test plan from Step 2. For each scenario:
- Drive the real browser via Playwright MCP tools (navigate, fill, click, assert) against `{{app_base_url}}`
- Capture a screenshot at the key verification point of each scenario
- Record actual vs. expected result
- Note anything the written test plan got wrong (selectors, copy, flow order) — this feeds Step 4

**Save as:** `{{qa_root}}/specs/{{module_name}}-exploratory-results.md` (or an `exploratory/` subfolder) with inline screenshot references and a pass/fail column per scenario.

---

## Step 4 — Generate automation scripts

Using the test plan (Step 2) **and** the real selectors/behavior confirmed in Step 3 (don't guess selectors that weren't verified):

- Follow the **Page Object Model**: one page/component object per screen (e.g., `LoginPage`, `ForgotPasswordPage`) exposing actions and locators; test spec files only orchestrate + assert
- One spec file per scenario group, named to match the test-plan IDs
- Include both positive and negative paths; avoid hardcoding secrets — read credentials from env/config

**Save as:** `{{qa_root}}/Test/{{module_name}}/` — e.g. `Test/{{module_name}}/pages/`, `Test/{{module_name}}/tests/`

---

## Step 5 — Execute and self-heal

- Run all specs under `{{qa_root}}/Test/{{module_name}}/`
- For failures caused by **brittle selectors or timing** (not real product defects): update the page object/locator and re-run
- For failures that look like a **real product defect**: do **not** silently "heal" them — leave the test failing/red and flag for Step 6
- Repeat run → heal → run until stable, or until remaining failures are confirmed genuine defects
- Keep a running log: what broke, why, what changed

**Output:** a healing log appended to (or alongside) the automation folder, e.g. `{{qa_root}}/Test/{{module_name}}/HEALING_LOG.md`

---

## Step 6 — Log defects (Jira, via Atlassian MCP)

For every genuine failure (manual from Step 3 or automated from Step 5), create a ticket at `{{jira_project_url}}` with label `{{jira_label}}` (create the label if missing) using this template:

```
Summary: <one-line defect description>
Description: <context — feature, scenario ID, when it started failing>
Steps to Reproduce:
  1. ...
  2. ...
Actual Behavior: <what happened>
Expected Behavior: <what the acceptance criteria says should happen>
Evidence: <screenshot(s) / video link(s) from Step 3 or Step 5>
Test Environment and Credentials: <URL, browser, test account used — never real customer creds>
Severity: <Blocker | Critical | Major | Minor | Trivial>
Priority: <Highest | High | Medium | Low | Lowest>
```

Cross-reference the ticket key back into the exploratory results / healing log for traceability.

---

## Step 7 — Test execution report

Compile a single HTML report combining:
- Step 3 manual exploratory results (with embedded screenshots)
- Step 4 automation scripts generated (list + coverage mapping to acceptance criteria)
- Step 5 execution outcome (PASS/FAIL per test, healing summary/diff)
- Step 6 defect log (linked Jira tickets, severity breakdown)
- Coverage analysis: acceptance criteria vs. scenarios vs. automated tests (call out any gaps)

**Save as:** `{{qa_root}}/Test_Results/{{module_name}}.html`

---

## Step 8 — Commit to Git (via GitHub MCP)

Stage and commit everything produced in Steps 2–7:
- `{{qa_root}}/specs/{{module_name}}.md` (+ exploratory results)
- `{{qa_root}}/Test/{{module_name}}/` (page objects, specs, healing log)
- `{{qa_root}}/Test_Results/{{module_name}}.html`

Use a descriptive commit message (what module, what was tested, defect count found). **Push only after confirming with the user** — pushing is a shared/visible action and should not happen silently, even inside an otherwise-automated workflow.

---

## Notes on reuse

- Re-run this whole playbook for a new module by swapping `{{module_name}}` and `{{user_story_path}}` — the folder conventions keep every module's artifacts separated and comparable.
- If acceptance criteria live in code/specs rather than a single markdown file (common in this repo — see `docs/specs/*.md`), point `{{user_story_path}}` at the most authoritative source and note in Step 1 if the docs and code disagree (docs can drift; code is ground truth).
- Steps 3–5 assume a **running, testable environment** — never point this workflow at production without explicit sign-off, since it creates accounts, submits forms, and may trigger real emails (e.g., password reset).
