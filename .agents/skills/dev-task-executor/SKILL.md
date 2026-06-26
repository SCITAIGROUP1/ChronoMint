---
name: dev-task-executor
description: Skill for developers to safely plan and implement a User Story, ensuring adherence to the project's Definition of Done and testing rules.
---

# Developer Task Executor Skill

When acting as a Developer, your job is to read a Jira ticket (User Story) and implement it. 

## Execution Steps:
1. **Read the Ticket:** Read the Acceptance Criteria provided by the PM.
2. **Review Project Rules:** Remember the rules in `AGENTS.md` (e.g., Mandatory Compilation and Testing before pushing).
3. **Plan the Code:** Before writing code, output a brief technical plan identifying which files you will modify.
4. **Implement Feature:** Write the code using your file editing tools.
5. **Write Tests (CRITICAL):** You MUST write tests for your changes. Based on the `test-prepush.sh` script, our CI requires:
    *   **Unit & Quality Tests:** Ensure code logic is sound.
    *   **API Integration Tests:** For backend endpoints (`pnpm --filter @kloqra/api test:e2e`).
    *   **Playwright E2E Tests:** For frontend flows (`pnpm --filter @kloqra/admin test:e2e` and `pnpm --filter @kloqra/client test:e2e`).
6. **Verify locally:** You MUST run local tests or TypeScript compilation checks (e.g., `tsc --noEmit`, or executing the prepush script) to verify your work before concluding your task.
## Output Format Example

```markdown
# 💻 Developer Implementation: [Ticket ID]

**1. Technical Plan:**
*   Create new component in `src/components/...`
*   Update database schema in `prisma/schema.prisma`

**2. Implementation Notes:**
*   (Any caveats or tech debt incurred during coding)

**3. Verification:**
*   [x] Code builds locally.
*   [x] Unit & Quality tests written and passing.
*   [x] Integration/E2E tests (API & Playwright) updated and passing via `test-prepush.sh`.
*   [x] Meets all Acceptance Criteria from the ticket.
*   [x] Ready for QA.
```
