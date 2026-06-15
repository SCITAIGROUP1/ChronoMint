# QA simple guide — no Terminal required

For QA testers who work in the **browser** and **GitHub** only. You do **not** need to run commands, read CI logs, or use git.

**Technical setup (optional):** [testing guide](../user-guides/qa/testing-guide.md)  
**Watch tests in Chromium (with dev):** [QA Chromium guide](QA_CHROMIUM_GUIDE.md)  
**Full process (technical QA / leads):** [QA_ENGINEER_GUIDE.md](QA_ENGINEER_GUIDE.md)

---

## Your job in one sentence

Open the app, follow the checklist on the GitHub issue, take screenshots, post PASS/FAIL, move the card on the board.

---

## What you need

| Item               | Details                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Browser**        | Chrome or Safari                                                                          |
| **GitHub account** | Access to [Project #4](https://github.com/orgs/SCITAIGROUP1/projects/4)                   |
| **Test app**       | **Staging** (preferred) — ask dev for URLs, or use [ENVIRONMENTS.md](ENVIRONMENTS.md)     |
| **Login**          | `member@kloqra.dev` / `password123` (client) · `admin@kloqra.dev` / `password123` (admin) |

You do **not** need: Terminal, Node, Postgres, git, or Cursor.

**Optional — see ACs in Chromium:** ask a dev to run [QA Chromium guide](QA_CHROMIUM_GUIDE.md) while you watch (screen share). You still sign off from your own manual run on staging.

---

## 5 steps every time

```text
1. PICK    → Project #4 → one card in "ready-for-qa"
2. READ    → Open the linked GitHub issue → Acceptance criteria (AC-1, AC-2…)
3. TEST    → Browser only — follow Manual steps on the issue
4. REPORT  → Comment on the issue (template below) + attach screenshots
5. MOVE    → Pass → "done" · Fail → "qa-failed"
```

---

## Step 1 — Pick a card

1. Go to [Project #4](https://github.com/orgs/SCITAIGROUP1/projects/4).
2. Find a card in **`ready-for-qa`**.
3. Drag it to **`testing`** (skip `qa-in-progress` — that is for automated checks; dev or tech QA handles that).

> **Epic issues** (title starts with `[Epic]`): do **not** test the epic. Open its **child story** (sub-issue) instead. Example: Epic #198 → test Story #199.

---

## Step 2 — Read the issue

On the GitHub issue, find:

1. **Acceptance criteria** — `AC-1`, `AC-2`, … (your checklist)
2. **QA verification matrix** → column **Manual steps** (what to click)

Ignore rows that say Unit, API, E2E, or Automated — **dev confirms those are green** before the card reaches you.

---

## Step 3 — Test in the browser

Use **staging** if dev gave you a link. Otherwise ask dev to start the app for you on a shared screen or use staging URLs from [ENVIRONMENTS.md](ENVIRONMENTS.md).

### Example — Story #199 (export CSV)

**AC-1**

1. Log in as `member@kloqra.dev` / `password123`
2. Go to **Timesheet**
3. Click **Export**
4. Open the downloaded file

**Pass if:** CSV has columns Date, Project, Task, Duration and at least one row.

**AC-2**

1. Still logged in as member
2. Set date range **2099-01-01** to **2099-01-07**
3. Click **Export**

**Pass if:** message says **No entries to export** and no file downloads.

**AC-3**

1. Log out (or use a private/incognito window)
2. Go to **Timesheet**

**Pass if:** you are sent to the **login** page.

**Full worked example:** [WALKTHROUGH_EPIC_198_STORY_199.md](examples/WALKTHROUGH_EPIC_198_STORY_199.md) — read only the **Manual** sections.

---

## Step 4 — Report (copy-paste comment)

Post a **comment on the same GitHub issue**. Copy this and fill in the blanks:

```text
QA sign-off GH-___
Environment: staging — <paste URL dev gave you>
Tester: <your name> — <today's date>

AC-1: PASS / FAIL — <one line what you saw>
AC-2: PASS / FAIL — <one line>
AC-3: PASS / FAIL — <one line>

Screenshots attached: GH-___-AC-1.png, GH-___-AC-2.png, …

Notes: <anything odd, or "none">
```

### Screenshots

Attach to the comment (drag and drop):

```text
GH-199-AC-1-export.png
GH-199-AC-2-toast.png
GH-199-AC-3-login.png
```

Use **PASS** only if every AC passed. If any AC failed, write **FAIL** for that row and explain what happened.

### If something failed

```text
AC-2 FAIL on GH-199
What I did: (numbered steps)
What I expected: toast "No entries to export"
What happened: file still downloaded
Screenshot: GH-199-AC-2-FAIL.png
```

Move the card to **`qa-failed`**. Dev fixes and tells you when to retest.

---

## Step 5 — Move the card

| Result           | Move card to    |
| ---------------- | --------------- |
| All ACs **PASS** | **`done`**      |
| Any AC **FAIL**  | **`qa-failed`** |

---

## What dev / tech QA does (not your job)

| Task                                   | Who                       |
| -------------------------------------- | ------------------------- |
| Run `pnpm serve`, Terminal, git        | Dev or tech QA            |
| Green CI / automated tests             | Dev before `ready-for-qa` |
| Move card to `qa-in-progress` and back | Dev or tech QA (optional) |
| Fix bugs                               | Dev                       |

You can ask in the issue: _“Please confirm CI is green before I test on staging.”_

---

## Release testing (end of sprint)

Once per sprint, dev deploys **staging**. You run the **smoke checklist** in the browser:

- [Client smoke](../user-guides/qa/testing-guide.md#client-app-smoke-checklist)
- [Admin smoke](../user-guides/qa/testing-guide.md#admin-app-smoke-checklist)

Post a short comment on the release issue or PR:

```text
QA release smoke — staging
Client: PASS / FAIL
Admin: PASS / FAIL
Blockers: none / describe
```

---

## Quick help

| Question              | Answer                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| App won't load?       | Ask dev — do not fix Terminal yourself                                                                |
| Wrong password?       | Use `password123` after dev seeded staging                                                            |
| Which issue to test?  | **Story**, not Epic                                                                                   |
| Where is proof saved? | Your GitHub comment + screenshots ([EVIDENCE.md](EVIDENCE.md))                                        |
| File a bug?           | [New bug](https://github.com/SCITAIGROUP1/ChronoMint/issues/new?template=bug.yml) — attach screenshot |

---

## One-page checklist (print or pin)

```text
[ ] Card picked from ready-for-qa (story, not epic)
[ ] Read AC-1, AC-2, … on GitHub issue
[ ] Dev confirmed staging URL / app is up
[ ] Tested each AC in browser
[ ] Screenshot per UI AC
[ ] Posted sign-off comment on issue
[ ] Card → done (or qa-failed)
```
