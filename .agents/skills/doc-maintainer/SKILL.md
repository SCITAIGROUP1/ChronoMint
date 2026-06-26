---
name: doc-maintainer
description: Skill for safely updating the project's single source of truth (.cursor/plans and docs/) when technical decisions change or new requirements are discovered during development.
---

# Documentation Maintainer Skill

When invoked to update documentation, your job is to act as a Technical Writer. You must ensure that the single source of truth (`.cursor/plans/` and `docs/`) accurately reflects any newly discovered requirements, scope changes, or technical pivots made during development.

## Execution Steps:

1. **Understand the Change:** Read the user's prompt to understand what decision was made or what requirement has changed.
2. **Locate the Right Doc:** Use your `grep_search` and `list_dir` tools to find the exact markdown file(s) in `.cursor/plans/` or `docs/` that need to be updated.
3. **Targeted Updates:** Use your `replace_file_content` or `multi_replace_file_content` tools to make precise updates to the markdown files. 
    *   **Do NOT** overwrite the entire file unless necessary.
    *   Preserve the existing structure, tone, and formatting of the original document.
4. **Append a Changelog (Optional but recommended):** If the document has a "Changelog" or "Revision History" section at the bottom, append a brief bullet point with today's date summarizing the change.
5. **Sync Reminder:** After successfully updating the documentation, always remind the user to invoke the `DocSyncManager` so that the backlog tracker and Jira tickets can be audited against these new changes.

## Best Practices
*   **Be Precise:** If a developer decides to use Redis instead of Memcached, find the exact line in the architecture doc mentioning Memcached and replace it.
*   **Keep it Clean:** Use markdown formatting (bolding, lists, code blocks) to ensure the documentation remains highly readable.
