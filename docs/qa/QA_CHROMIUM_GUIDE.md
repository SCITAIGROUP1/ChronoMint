# QA with Chromium — watch tests in the browser

For testers who want to **see** what is being checked, without writing code. A dev or tech lead runs one command; **Chromium opens** and you watch the same steps as the GitHub issue ACs.

**Browser-only QA (no Terminal):** [QA_SIMPLE_GUIDE.md](QA_SIMPLE_GUIDE.md)  
**Full technical QA:** [QA_ENGINEER_GUIDE.md](QA_ENGINEER_GUIDE.md)

---

## Three ways to use Chromium

| Mode                  | Who runs Terminal         | What QA sees                               | Best for                       |
| --------------------- | ------------------------- | ------------------------------------------ | ------------------------------ |
| **A — Manual**        | Nobody                    | Normal Chrome/Safari on staging            | Day-to-day testing             |
| **B — Watch**         | Dev runs `test:e2e:watch` | Chromium runs AC steps automatically       | “Show me what AC-1 looks like” |
| **C — Playwright UI** | Dev runs `test:e2e:ui`    | Control panel + Chromium; click ▶ per test | Workshops, training, debugging |

Modes B and C need the app running locally (`pnpm serve`) or reuse an already-running dev stack.

---

## Mode A — Manual (normal browser)

Same as the simple guide: open staging (or localhost if dev started the app), log in, follow AC steps, take screenshots.

No Playwright required.

---

## Mode B — Watch automated tests in Chromium

Dev (or tech QA) runs this while you watch the screen or a shared call.

### One-time: app must be running

```bash
corepack pnpm serve
```

Leave that Terminal open.

### Watch export tests (Story #199)

**New Terminal:**

```bash
corepack pnpm --filter @kloqra/client test:e2e:headed timesheet
```

**What you see:**

1. Chromium window opens
2. Robot logs in as member (invisible setup step)
3. Goes to **Timesheet**
4. **AC-1:** clicks Export → CSV downloads
5. **AC-2:** sets empty date range → toast “No entries to export”

**Expected in Terminal:** `5 passed`

### Watch login redirect (AC-3)

```bash
corepack pnpm --filter @kloqra/client test:e2e:headed smoke
```

**What you see:** Chromium opens `/timesheet` while logged out → redirects to **login**.

### Your job after watching

If what you saw matches the issue ACs, do your **manual pass** on staging (or repeat in the same flow) and post sign-off on GitHub. Attach screenshots from your manual run.

---

## Mode C — Playwright UI (click to run each test)

Best for training: pick one test, watch it, discuss, repeat.

```bash
corepack pnpm test:e2e:ui
```

**What opens:**

1. **Playwright UI** window (test list on the left)
2. Click **▶** next to a test (e.g. `AC-1: member exports CSV…`)
3. **Chromium** runs that test; timeline shows each click

**Tips for QA:**

- Green check = that AC step passed in automation
- Red X = tell dev; do not sign off
- You can run tests one at a time — matches “one AC at a time” on the issue

**Close:** quit the Playwright UI window when done.

---

## Pairing session (recommended for new QA)

1. Dev shares screen
2. Dev opens GitHub issue #199 — read AC-1 aloud
3. Dev runs `test:e2e:headed timesheet` — QA watches AC-1 and AC-2 in Chromium
4. QA repeats **manually on staging** with their own login
5. QA posts sign-off comment + screenshots

---

## Record a manual flow (optional, dev only)

If QA’s steps should become a future automated test:

```bash
corepack pnpm serve   # app running
corepack pnpm --filter @kloqra/client test:e2e:codegen
```

Chromium opens with a **recorder**. QA clicks through the flow; Playwright writes a script. Dev saves it — not required for sign-off.

---

## Where to see results after a run

| Result                 | Where                                                  |
| ---------------------- | ------------------------------------------------------ |
| Pass/fail in UI        | Playwright UI or Terminal (`N passed`)                 |
| Screenshots (failures) | `apps/client/playwright-report/index.html`             |
| Test hub               | `corepack pnpm test:dashboard` → http://localhost:9321 |
| Official evidence      | GitHub issue comment ([EVIDENCE.md](EVIDENCE.md))      |

---

## Command cheat sheet (dev runs these)

```bash
# App running first
corepack pnpm serve

# Watch export ACs in visible Chromium
corepack pnpm --filter @kloqra/client test:e2e:headed timesheet

# Watch login redirect AC
corepack pnpm --filter @kloqra/client test:e2e:headed smoke

# Interactive UI — pick tests one by one
corepack pnpm test:e2e:ui

# Open last HTML report
open apps/client/playwright-report/index.html
```

---

## Which path should I use?

```text
Non-technical, alone        → QA_SIMPLE_GUIDE (staging + screenshots)
Learning / first time       → Mode C (Playwright UI) with dev on a call
“Show me AC-1”              → Mode B (headed watch)
Technical QA / before release → QA_ENGINEER_GUIDE (full automated + manual)
```
