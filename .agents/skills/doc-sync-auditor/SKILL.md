---
name: doc-sync-auditor
description: Skill for auditing the project backlog tracker against the latest single-source-of-truth documentation to identify and flag discrepancies.
---

# Documentation Sync Auditor Skill

When invoked to run a sync or audit, your job is to ensure the `.agents/backlog_tracker.json` remains perfectly aligned with the single source of truth (`.cursor/plans/` and `docs/`). 

Over time, Product Managers and Architects will update the markdown documentation. When this happens, previously generated Epics and Stories in the JSON tracker may become outdated.

## Execution Steps:

1. **Read the Tracker:** Read the current state of `.agents/backlog_tracker.json`.
2. **Scan the Docs:** Use your file reading tools to scan the relevant module documentation in `.cursor/plans/` and `docs/`.
3. **Compare & Audit:** Cross-reference the requirements in the docs against the Epics and Stories listed in the tracker.
4. **Identify Gaps:** Look for three specific things:
    *   **Missing Features:** A new requirement was added to the docs, but there is no corresponding Epic/Story in the tracker.
    *   **Obsolete Features:** A Story exists in the tracker, but the requirement was removed from the docs.
    *   **Changed Scope:** The core acceptance criteria of a feature changed in the docs, meaning the existing ticket is outdated.
5. **Update Tracker Status:** If you find discrepancies, you must edit `.agents/backlog_tracker.json`. Update the `status` of affected Epics/Stories to `"needs_review_doc_drift"`.
6. **Generate Audit Report:** Output a clean markdown report summarizing exactly what drifted out of sync, so the user knows which Jira/GitHub tickets they need to update.

## Output Format Example

```markdown
# 🔄 Documentation Sync Audit Report

**Audit Status:** ⚠️ Discrepancies Found

### 1. New Requirements Detected (Missing from Tracker)
*   The document `docs/auth_v2.md` now mentions "Passkey Support", but this is not present in Epic 1. 
*   **Action:** Need to invoke AgileArchitect to generate a new story for Passkeys.

### 2. Obsolete Stories (Removed from Docs)
*   **Story 1.3 (Social Login with Twitter)** is in the tracker, but was removed from the master plan.
*   **Action:** Flagged as `needs_review_doc_drift` in tracker. Consider deleting the Jira ticket.

### 3. Scope Changes
*   ...
```
