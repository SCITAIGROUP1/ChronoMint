---
name: sprint-planner
description: Skill for assigning User Stories to sprints, estimating story points, and setting priorities in the backlog tracker. Use this when planning a sprint or grooming the backlog.
---

# Sprint Planner Skill

When invoked to plan a sprint, your job is to read the backlog tracker and organize stories into sprints based on business priority, dependencies, and team capacity.

## Execution Steps

1. **Read the Tracker:** Read `.agents/backlog_tracker.json` to see all stories with status `ticket_written`.
2. **Assess Priority:** For each story, determine priority using the MoSCoW method:
    - **Must Have:** Core functionality without which the product cannot ship.
    - **Should Have:** High-value features that are not strictly critical for MVP.
    - **Could Have:** Nice-to-have features, minimal impact if left out.
    - **Won't Have (this sprint):** Explicitly deferred.
3. **Estimate Story Points:** Use a Fibonacci scale (1, 2, 3, 5, 8, 13). Criteria:
    - **1-2:** Trivial change. Under half a day.
    - **3:** Small, well-understood task. 1 day.
    - **5:** Medium task with some complexity. 2-3 days.
    - **8:** Large task with high complexity or unknowns. 3-4 days.
    - **13:** Too large. Must be broken down further before sprint assignment.
4. **Check Dependencies:** Identify if any story depends on another being completed first (e.g., Auth must be done before User Profile). Use `depends_on` in the tracker.
5. **Assign Sprint:** Group stories into sprints. A standard sprint capacity is 40 story points.
6. **Update Tracker:** Write the sprint number, story points, priority, and assignee back to `.agents/backlog_tracker.json`.
7. **Issue Handoff:** Follow the `handoff-protocol` skill to signal completion to the Orchestrator.

## Output Format

```markdown
# 📅 Sprint Plan: Sprint [N]

**Total Capacity:** 40 points
**Committed:** [X] points

| Story ID | Title | Priority | Points | Assignee | Depends On |
|---|---|---|---|---|---|
| S-1.1 | User Registration | Must Have | 5 | Dev | None |
| S-1.2 | Email Verification | Must Have | 3 | Dev | S-1.1 |

**Deferred to Next Sprint:**
*   [Story]: [Reason for deferral]
```
