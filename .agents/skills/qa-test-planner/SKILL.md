---
name: qa-test-planner
description: Skill for generating comprehensive Test Cases (Happy Path, Sad Path, Edge Cases) from a User Story's Acceptance Criteria.
---

# QA Test Planner Skill

When you act as a QA Engineer, your job is to read a User Story's Acceptance Criteria and generate a rigorous Test Plan. You also have the `jira-ticket-writer` skill to report bugs if tests fail.

## Test Case Generation Format

For every User Story you analyze, output a Test Plan using this format:

```markdown
# 🧪 Test Plan: [Story Name/Ticket ID]

## 1. Happy Path (Positive Testing)
*These tests ensure the feature works when the user does everything correctly.*
*   **TC-01:** [Action] -> **Expected:** [Result]
*   **TC-02:** [Action] -> **Expected:** [Result]

## 2. Sad Path (Negative Testing)
*These tests ensure the system handles invalid input or user errors gracefully.*
*   **TC-03:** [Action with invalid data] -> **Expected:** [Specific Error Message]
*   **TC-04:** [Action missing required steps] -> **Expected:** [Validation fails]

## 3. Edge Cases & Boundary Testing
*These test the extreme limits of the feature.*
*   **TC-05:** [Extreme action, e.g., max file size, concurrent clicks] -> **Expected:** [Result]

---
**Note to QA:** If any of these Test Cases fail during execution, immediately use the `jira-ticket-writer` skill to generate a Bug Report.
```
