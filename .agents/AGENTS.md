# Project-Scoped Rules

## Mandatory Compilation and Testing Before Pushing

**CRITICAL RULE**: Do not push code without strictly verifying compilation and tests locally first.

- **Why**: Bypassing compilation checks wastes CI minutes on obvious TypeScript or linting errors.
- **Action**: Before running `git push` (especially when using bypass flags like `--no-verify` or `SKIP_TEST_CHECK=1`), you MUST manually execute local TypeScript checks (e.g., `tsc -p tsconfig.json --noEmit` on the modified packages) or run the relevant local test suite to guarantee the code builds successfully without errors.
- **Fallback**: If global or turbo-level test/build scripts fail due to environment issues (e.g., `pnpm` not found in turbo), you must CD directly into the specific package/app directory (e.g., `cd apps/admin`) and run the localized compiler (`tsc --noEmit` or `vitest`) to verify the integrity of your changes before pushing.

## Spec-Driven Development Context

**CRITICAL RULE**: Always incorporate context from `.cursor/plans` and `docs/` before generating tickets or breaking down applications.

- **Why**: The project uses Spec-Driven Development. The single source of truth for features and architecture resides in these folders.
- **Action**: When asked to break down an Epic/Story or write a Jira/GitHub ticket, you MUST first search and read relevant documents in `.cursor/plans/` and `docs/` to ensure your output aligns with the existing project specifications.

## Product Focus over Technical Implementation

**CRITICAL RULE**: When breaking down Epics/Stories or writing PM tickets, keep the focus on business value, user flows, and clear acceptance criteria. Do not be overly technical. 

- **Why**: PMs and Architects should define the *What* and *Why*, not the *How*. Getting too deep into database schemas or code architecture at the ticket stage confuses stakeholders and locks developers into premature technical decisions.
- **Action**: Unless explicitly asked by a developer, avoid writing specific code snippets, SQL schemas, or dense technical implementation steps in your User Stories and Epics. Focus on the user's perspective.

## Backlog Tracker Maintenance

**CRITICAL RULE**: We maintain a central state of our project breakdown in a JSON tracker.

- **Action**: Whenever you (the Architect) break down a new module into Epics and Stories, you MUST use your file writing tools to update `.agents/backlog_tracker.json` and insert the new Epics and Stories.
- **Action**: Whenever you (the PM) write a ticket for a story, you MUST update `.agents/backlog_tracker.json` to change that story's status to `ticket_written`. You must also execute the `github_project_sync.js` script to push the ticket directly to the GitHub Project board (https://github.com/orgs/SCITAIGROUP1/projects/8).
