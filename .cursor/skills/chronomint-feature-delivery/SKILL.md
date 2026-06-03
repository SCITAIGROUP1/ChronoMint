---
name: chronomint-feature-delivery
description: >-
  ChronoMint feature delivery order, MIP handoff, and pre-PR checks. Use when
  implementing any feature across contracts, API, or frontend apps.
---

# ChronoMint feature delivery

## Execution order

1. Read `docs/specs/<feature>.md`
2. Update `packages/contracts` (LSA / contract gate)
3. QA writes failing tests
4. BE implements `apps/api/src/modules/<feature>/`
5. FE implements `apps/client` or `apps/admin`
6. Update `docs/agent/ROC.md` and `TASK_BOARD.json`

## MIP handoff template

```markdown
<AGENT_INSTRUCTION role="BE" task_id="P1-07">

- Target: apps/api/src/modules/timer/
- Contracts: packages/contracts/src/dto/timer.dto.ts
- TDD: apps/api/src/modules/timer/\*_/_.spec.ts must fail first
  </AGENT_INSTRUCTION>
```

## Pre-PR checklist

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## References

- [docs/agent/AGENTS.md](../../docs/agent/AGENTS.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
