# Kloqra QA hub

Operational docs for manual + automated QA on [GitHub Project #4](https://github.com/orgs/SCITAIGROUP1/projects/4).

## Start here

| Audience                              | Document                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **You (onboarding QA)**               | **[Onboarding script for managers](QA_ONBOARDING_FOR_MANAGERS.md)** — how to explain QA to non-technical testers      |
| **QA testers (no Terminal)**          | **[QA simple guide](QA_SIMPLE_GUIDE.md)** — browser + GitHub only                                                     |
| **QA + dev (watch Chromium)**         | **[QA Chromium guide](QA_CHROMIUM_GUIDE.md)** — see automated AC steps in the browser                                 |
| **QA engineers (official guideline)** | **[QA engineer guide](QA_ENGINEER_GUIDE.md)** — manual + automated, one task at a time                                |
| **QA engineers (full sample flow)**   | **[Epic #198 walkthrough](examples/WALKTHROUGH_EPIC_198_STORY_199.md)** — commands, prompts, sign-off                 |
| **QA engineers (setup & smoke)**      | [User testing guide](../user-guides/qa/testing-guide.md) — first-time setup, checklists                               |
| **QA agents / devs**                  | [.cursor/skills/kloqra-qa-workflow/SKILL.md](../../.cursor/skills/kloqra-qa-workflow/SKILL.md) — AC-driven board flow |
| **Developers**                        | [TESTING.md](../development/TESTING.md) — commands, CI, coverage                                                      |

## Process docs

| Doc                                                                                                                              | Purpose                                                              |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [QA_SIMPLE_GUIDE.md](QA_SIMPLE_GUIDE.md)                                                                                         | **Non-technical** — 5 steps, copy-paste sign-off, no commands        |
| [QA_CHROMIUM_GUIDE.md](QA_CHROMIUM_GUIDE.md)                                                                                     | **Watch mode** — Playwright UI / headed Chromium for training        |
| [QA_ENGINEER_GUIDE.md](QA_ENGINEER_GUIDE.md)                                                                                     | **Technical QA** — manual + automated flows per issue                |
| **[WALKTHROUGH_EPIC_198_STORY_199.md](examples/WALKTHROUGH_EPIC_198_STORY_199.md)**                                              | **Full sample** — Epic #198 / Story #199 (commands, output, prompts) |
| [QA_ENGINEER_GUIDE.md#worked-example-epic-198--story-199-export](QA_ENGINEER_GUIDE.md#worked-example-epic-198--story-199-export) | Summary + link to full walkthrough                                   |
| [BOARD_WORKFLOW.md](BOARD_WORKFLOW.md)                                                                                           | 10 lanes, QA queue, per-issue verification                           |
| [ENVIRONMENTS.md](ENVIRONMENTS.md)                                                                                               | Local ports + staging URLs                                           |
| [EVIDENCE.md](EVIDENCE.md)                                                                                                       | **Where proof lives** — screenshots, CI links, naming, sign-off      |
| [BUG_TRIAGE.md](BUG_TRIAGE.md)                                                                                                   | P0–P3, labels, bug vs story                                          |
| [RELEASE_PROCESS.md](RELEASE_PROCESS.md)                                                                                         | Sprint-end staging sign-off                                          |
| [SPRINT1_DISPATCH.md](SPRINT1_DISPATCH.md)                                                                                       | Active sprint QA pickup (#199–#201)                                  |

## Quick links

- **Board:** https://github.com/orgs/SCITAIGROUP1/projects/4
- **New bug:** https://github.com/SCITAIGROUP1/ChronoMint/issues/new?template=bug.yml
- **New story:** https://github.com/SCITAIGROUP1/ChronoMint/issues/new?template=story.yml
- **Backlog manifest:** [docs/agent/backlog/README.md](../agent/backlog/README.md)

## Unique flow (summary)

1. Every **Ready** story has **AC-1..N** + **QA verification matrix** on the issue.
2. After dev merge → card in `ready-for-qa`.
3. QA runs **Automated** matrix rows → `testing` → **Manual** rows.
4. QA posts **AC-ID sign-off** on issue → `done` (evidence: [EVIDENCE.md](EVIDENCE.md)).
5. Sprint end → staging smoke → **release sign-off** on PR.

Kanban posting standards: [kloqra-github-kanban skill](../../.cursor/skills/kloqra-github-kanban/SKILL.md).
