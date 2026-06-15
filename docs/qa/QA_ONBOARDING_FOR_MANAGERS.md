# How to explain QA to non-technical testers

**For:** QA lead, PM, or dev onboarding a new tester  
**Give testers:** [QA_SIMPLE_GUIDE.md](QA_SIMPLE_GUIDE.md) only — not this doc.

---

## The 30-second version (say this first)

> “Your job is to use the app like a real user and check a short list on each GitHub ticket.  
> You work in the **browser** and **GitHub** — not Terminal.  
> If something looks wrong, you take a screenshot and write what happened.  
> When everything passes, you post a short comment and move the card to **Done**.”

---

## What they need vs don’t need

| They need                        | They don’t need                 |
| -------------------------------- | ------------------------------- |
| Chrome or Safari                 | Terminal commands               |
| GitHub login + Project board     | git, branches, PRs              |
| Staging link from dev            | Running the app locally         |
| Screenshot tool (built into Mac) | Reading CI logs                 |
| Copy-paste sign-off template     | Playwright (optional demo only) |

---

## Explain the board in plain language

Use a **kitchen ticket** analogy:

| Board column     | Plain English                              |
| ---------------- | ------------------------------------------ |
| **ready-for-qa** | “Food is ready — your table”               |
| **testing**      | “You’re tasting it now”                    |
| **done**         | “You said it’s good”                       |
| **qa-failed**    | “Something’s wrong — sent back to kitchen” |

**Rule:** One ticket at a time. Finish before picking the next.

**Epic vs story:** “Epic = whole feature menu. Story = one dish. You taste **one dish**, not the whole menu.”  
Example: Epic #198 → test Story #199 only.

---

## The 5 steps (teach in order)

```text
1. PICK   — Project board → one card in “ready-for-qa”
2. READ   — Open the GitHub issue → AC-1, AC-2, AC-3 (your checklist)
3. TEST   — Browser → do each line (dev gives you the URL + login)
4. REPORT — Comment on the issue: PASS/FAIL + screenshots
5. MOVE   — All pass → Done · Any fail → QA failed
```

Walk through **one real story** live (recommend #199 export).

---

## 30-minute onboarding agenda

| Min   | You do                                         | They do                         |
| ----- | ---------------------------------------------- | ------------------------------- |
| 0–5   | Show Project #4, pick a card, open issue       | Watch                           |
| 5–10  | Read AC-1 aloud from issue #199                | Read along                      |
| 10–20 | They log in on staging, click Export, open CSV | Hands-on                        |
| 20–25 | They post a practice comment (draft OK)        | Copy template from simple guide |
| 25–30 | Move card, Q&A                                 | Ask questions                   |

**Optional bonus (10 min):** Dev runs Playwright UI, they watch AC-1 in Chromium once — “this is what the robot checks; you check the same on staging.”

---

## What to say about automated tests

> “Developers run robot tests before you start.  
> Your job is the **human check** — things robots miss: wording, layout, ‘does this feel right?’  
> If dev says **CI is green**, you don’t need to run any commands.”

---

## Dev handoff (they must get this before testing)

Dev posts on the issue (template: [templates/DEV_QA_HANDOFF.md](templates/DEV_QA_HANDOFF.md)):

- Staging URL
- Login email + password
- “CI green — manual only”
- Which ACs to test

**Without this, testers get stuck.** Make handoff a team rule.

---

## Sign-off — one example to show

```text
QA sign-off GH-199
Environment: staging — https://kloqra-client-staging.vercel.app
Tester: Sam — 2026-06-15

AC-1: PASS — exported CSV, has Date/Project/Task/Duration
AC-2: PASS — empty dates showed “No entries to export”
AC-3: PASS — logged out, sent to login page

Screenshots attached.
```

---

## When something fails — one script

> “Don’t fix it. Screenshot + numbered steps + what you expected vs what happened.  
> Move card to **qa-failed**. Dev fixes. You retest **only that AC**.”

---

## Email / Slack message to send new QA

```text
Welcome! Your QA guide (browser + GitHub only):
https://github.com/SCITAIGROUP1/ChronoMint/blob/qa/release_v1/docs/qa/QA_SIMPLE_GUIDE.md

Board: https://github.com/orgs/SCITAIGROUP1/projects/4

Day 1: we’ll walk through one story together (#199 export).
You’ll need: GitHub access, Chrome, staging link (I’ll send before the call).

You do NOT need Terminal or coding.
```

(Adjust branch/path if docs live elsewhere.)

---

## Common questions (answers to memorize)

| Question                 | Answer                                      |
| ------------------------ | ------------------------------------------- |
| “Which issue do I test?” | The **story** in ready-for-qa, not the epic |
| “App won’t load?”        | Ask dev — don’t troubleshoot Terminal       |
| “What’s AC-2?”           | Line 2 on the GitHub issue checklist        |
| “Do I run Playwright?”   | No — optional watch with dev on day 1 only  |
| “Where do I save proof?” | Screenshot on the GitHub issue comment      |

---

## Docs by audience

| Person                 | Send this                                                  |
| ---------------------- | ---------------------------------------------------------- |
| Non-technical QA       | [QA_SIMPLE_GUIDE.md](QA_SIMPLE_GUIDE.md)                   |
| You (trainer)          | This file                                                  |
| Dev before handoff     | [templates/DEV_QA_HANDOFF.md](templates/DEV_QA_HANDOFF.md) |
| Optional Chromium demo | [QA_CHROMIUM_GUIDE.md](QA_CHROMIUM_GUIDE.md)               |
| Technical QA lead      | [QA_ENGINEER_GUIDE.md](QA_ENGINEER_GUIDE.md)               |
