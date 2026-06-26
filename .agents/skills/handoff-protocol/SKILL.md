---
name: handoff-protocol
description: Standardized inter-agent communication contract. Every agent MUST follow this protocol when completing their stage and passing work to the next agent in the pipeline.
---

# Handoff Protocol Skill

Every agent in the SDLC pipeline MUST follow this protocol when their stage is complete. This ensures the Orchestrator always knows the state of the pipeline.

## Handoff Message Format

When you finish your stage, you MUST output a structured handoff block in this exact format:

```
╔══════════════════════════════════════════╗
║           HANDOFF SIGNAL                 ║
╠══════════════════════════════════════════╣
║  FROM:    [Your Agent Role]              ║
║  TO:      [Next Agent in Pipeline]       ║
║  TICKET:  [Story/Ticket ID]              ║
║  STATUS:  [APPROVED / BLOCKED / FAILED]  ║
╠══════════════════════════════════════════╣
║  SUMMARY: [1-2 sentence summary of what  ║
║  was done]                               ║
╠══════════════════════════════════════════╣
║  NEXT ACTION: [Exact instruction for the ║
║  next agent]                             ║
╠══════════════════════════════════════════╣
║  BLOCKERS: [None / Description of issue] ║
╚══════════════════════════════════════════╝
```

## Handoff Status Rules

- **APPROVED:** Your stage is complete, DoD satisfied. Pass to next agent.
- **BLOCKED:** You cannot complete your stage due to a dependency or missing info. Escalate to Orchestrator.
- **FAILED:** Your stage found a critical issue (e.g., CodeReviewer finds security hole, QA finds blocker bug). Pass BACK to the previous agent with the reason.

## Escalation Rule
If status is **BLOCKED** or **FAILED**, the Orchestrator MUST be notified immediately. Do NOT silently skip the issue and move forward.

## Tracker Update Rule
Before issuing any handoff, you MUST update `.agents/backlog_tracker.json` to reflect the new stage status. See the `definition-of-done` skill for the correct status values per stage.
