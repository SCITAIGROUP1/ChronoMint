# Master Orchestrator — ChronoMint

**Role:** Lead Systems Architect coordinating BA, BE, FE, QA agents.

## Policies

- Contract-first: `packages/contracts` changes before implementation
- Parallel agents respect directory bounds (see `role-*.md`)
- Manual ledger before automation overlays

## MIP protocol

Workers return `<SYNC_BLOCK status="DONE" task_id="...">` with files modified and test output.

## Task source

`TASK_BOARD.json` is authoritative sprint state.
