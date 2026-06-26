---
name: definition-of-done
description: Universal Definition of Done checklist enforced at every stage of the SDLC pipeline. Every agent must verify DoD before signaling a handoff.
---

# Definition of Done (DoD)

This is the universal contract that every agent in the pipeline must satisfy before passing work to the next stage. No agent may signal a handoff unless all applicable DoD criteria are met.

## Stage 1: Story Ready (AgileArchitect → ProductManager)
- [ ] Epic is linked to a documented plan in `.cursor/plans/` or `docs/`
- [ ] Story has a clear User Persona, Action, and Business Value
- [ ] Story represents a vertical slice of value (not a technical task)
- [ ] Story is achievable in a single sprint (not too large)

## Stage 2: Ticket Written (ProductManager → SprintPlanner)
- [ ] Ticket has a clear, unambiguous Title
- [ ] All Acceptance Criteria are written as testable conditions
- [ ] Out-of-scope items are explicitly listed
- [ ] Ticket is linked to its parent Epic in the backlog tracker
- [ ] `backlog_tracker.json` status updated to `ticket_written`

## Stage 3: Sprint Assigned (SprintPlanner → LeadDeveloper)
- [ ] Story has a sprint number assigned
- [ ] Story has story points estimated
- [ ] Story has a priority set (Blocker / High / Medium / Low)
- [ ] Story has an assignee
- [ ] `backlog_tracker.json` status updated to `in_sprint`

## Stage 4: Implementation Done (LeadDeveloper → CodeReviewer)
- [ ] All Acceptance Criteria from the ticket are implemented
- [ ] Unit tests written and passing
- [ ] API Integration tests written and passing
- [ ] Playwright E2E tests written and passing
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `test-prepush.sh` passes locally
- [ ] No hardcoded secrets or credentials in code
- [ ] `backlog_tracker.json` status updated to `in_review`

## Stage 5: Code Review Passed (CodeReviewer → QAEngineer)
- [ ] Code meets project style standards (ESLint/Prettier)
- [ ] All Acceptance Criteria are verifiably covered by the implementation
- [ ] No obvious security vulnerabilities (auth bypass, SQL injection, data exposure)
- [ ] Tenant isolation is maintained (critical for SaaS)
- [ ] No tech debt introduced without a linked follow-up ticket
- [ ] `backlog_tracker.json` status updated to `review_approved`

## Stage 6: QA Passed (QAEngineer → ReleaseManager)
- [ ] All Happy Path test cases passed
- [ ] All Sad Path / Negative test cases passed
- [ ] All Edge Cases tested
- [ ] No open Blocker or High priority bugs against this story
- [ ] `backlog_tracker.json` status updated to `qa_passed`

## Stage 7: Release Ready (ReleaseManager → Done)
- [ ] Story is tagged with a release version
- [ ] Release notes entry written
- [ ] DocSyncManager has been invoked and no `needs_review_doc_drift` flags remain
- [ ] Go/No-Go decision recorded in tracker
- [ ] `backlog_tracker.json` status updated to `released`
