# Sprint 1 QA dispatch

Board: [Project #4](https://github.com/orgs/SCITAIGROUP1/projects/4) · Skill: [kloqra-qa-workflow](../../.cursor/skills/kloqra-qa-workflow/SKILL.md)

## Ready column — dispatch status

| Issue                                                         | Story                      | QA lane                       | Status                                                      |
| ------------------------------------------------------------- | -------------------------- | ----------------------------- | ----------------------------------------------------------- |
| [#201](https://github.com/SCITAIGROUP1/ChronoMint/issues/201) | PresenceService unit tests | `qa-in-progress` → `testing`  | Tests added — run `pnpm --filter @kloqra/api test presence` |
| [#200](https://github.com/SCITAIGROUP1/ChronoMint/issues/200) | Prisma DTO mappers         | `ready-for-qa` after BE merge | API e2e extended in `workspace.e2e.ts`, `timesheets.e2e.ts` |
| [#199](https://github.com/SCITAIGROUP1/ChronoMint/issues/199) | Wire timesheet export      | `ready-for-qa` after FE merge | `TimesheetExport` on timesheet page + Playwright AC-1..3    |

## Verify locally

```bash
# #201 — unit
pnpm --filter @kloqra/api test presence

# #200 — integration (Postgres + seed)
pnpm prisma:seed && pnpm test:integration

# #199 — client e2e (needs serve stack)
pnpm --filter @kloqra/client test:e2e timesheet
pnpm --filter @kloqra/client test:e2e smoke
```

## Sign-off commands

```bash
node .cursor/skills/kloqra-qa-workflow/scripts/print-signoff.mjs 201 --env local --acs 3
node .cursor/skills/kloqra-qa-workflow/scripts/print-signoff.mjs 200 --env local --acs 3
node .cursor/skills/kloqra-qa-workflow/scripts/print-signoff.mjs 199 --env local --acs 3
```

Post each comment on the GitHub issue → move card to `done`.

## Known gap (#200 AC-3)

`workspace.controller` still uses `throw new Error("Forbidden")` for wrong workspace id — may return **500** instead of **403** `DomainException`. E2e accepts either until BE fixes.
