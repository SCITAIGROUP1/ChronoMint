# Issue walkthrough response format

When the user asks **“how do we test issue #N?”** or **“walk me through QA for #N”**, respond using this structure. Read the issue first (`gh issue view N` or `docs/agent/backlog/bodies/`).

## Step 1 — Classify the issue

| Title prefix | Type  | QA tests directly?                                |
| ------------ | ----- | ------------------------------------------------- |
| `[Epic]`     | Epic  | **No** — track children; use epic for scope only  |
| `[Story]`    | Story | **Yes** — full automated + manual on this card    |
| `[Task]`     | Task  | **Yes** — usually one matrix row / one role slice |
| `[Bug]`      | Bug   | **Yes** — fix-verification AC-1 + regression row  |

If user gives an **Epic** number, identify **child stories** (sub-issues) and walk through the **first QA-ready story**, not the epic itself.

## Step 2 — Response sections (required)

Use these headings in order:

1. **Epic vs story** (if applicable) — table + hierarchy diagram
2. **How this fits the board** — current lane; which card QA moves
3. **Walkthrough for the testable issue** — the Story/Task/Bug number
4. **Step 1 — Pick the card** — Project #4 lane transition
5. **Step 2 — Automated flow** — PR Checks + matrix commands table (AC → command)
6. **Step 3 — Manual flow** — numbered browser steps per AC
7. **Step 4 — Sign-off** — `print-signoff.mjs` command + example comment
8. **Step 5 — Epic closure** (if epic) — when parent # closes
9. **Visual** — mermaid flowchart (epic → story → automated → manual → done)
10. **Cheat sheet** — 5-line summary

## Step 3 — Rules

- Cite **AC-1, AC-2** from the issue body — do not invent criteria
- Copy **Automated** commands from the QA matrix verbatim
- **Local** for per-issue; **staging** only for release or deploy-specific items
- Link: [QA_ENGINEER_GUIDE.md](../../../../docs/qa/QA_ENGINEER_GUIDE.md), issue URL, spec in `docs/specs/`
- If issue lacks matrix, say so and point to [kloqra-github-kanban](../../kloqra-github-kanban/SKILL.md) — story not ready for QA

## Scaffold command

```bash
node .cursor/skills/kloqra-qa-workflow/scripts/issue-walkthrough.mjs <issue#>
```

Use output as the skeleton; fill from live issue body and codebase.

**Canonical filled example:** [docs/qa/examples/WALKTHROUGH_EPIC_198_STORY_199.md](../../../../docs/qa/examples/WALKTHROUGH_EPIC_198_STORY_199.md) (Epic #198 → Story #199).
