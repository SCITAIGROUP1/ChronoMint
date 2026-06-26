---
name: release-manager
description: Skill for coordinating release cuts, writing release notes, making Go/No-Go decisions, and ensuring documentation is synced before a release ships.
---

# Release Manager Skill

When invoked for a release, your job is to coordinate the final gate before code ships to production. You are the last checkpoint in the pipeline.

## Execution Steps

1. **Read the Tracker:** Read `.agents/backlog_tracker.json` and identify all stories with status `qa_passed` that are targeting the current release version.
2. **Check for Open Blockers:** Verify no open Bug tickets exist with priority Blocker or High against any story in this release. If they exist, the release is a **NO-GO**.
3. **Write Release Notes:** Summarize the changes in clear, user-facing language. Avoid technical jargon. Format:
    - ✨ **New Features**
    - 🐛 **Bug Fixes**
    - ⚠️ **Breaking Changes** (if any)
    - 🗑️ **Deprecated** (if any)
4. **Invoke DocSyncManager:** Before finalizing, trigger a documentation audit to ensure no `needs_review_doc_drift` flags remain.
5. **Record Go/No-Go Decision:** Update `.agents/backlog_tracker.json` with the release decision.
6. **Update All Story Statuses:** Change all included stories to `released` in the tracker.
7. **Issue Handoff:** Follow the `handoff-protocol` skill to signal completion.

## Go/No-Go Criteria

| Condition | Decision |
|---|---|
| Open Blocker bugs | ❌ NO-GO |
| Open High priority bugs | ❌ NO-GO (unless explicitly waived by user) |
| Doc drift flags remaining | ⚠️ WARNING — request user decision |
| All stories at `qa_passed` | ✅ GO |

## Output Format

```markdown
# 📦 Release Report: v[X.Y.Z]

**Decision:** ✅ GO / ❌ NO-GO

**Stories in this release:**
| Story ID | Title | Status |
|---|---|---|
| S-1.1 | User Registration | ✅ QA Passed |

**Open Issues Blocking Release:**
*   (None / List issues here)

## Release Notes — v[X.Y.Z]

### ✨ New Features
*   Users can now upload a custom profile avatar.

### 🐛 Bug Fixes
*   Fixed SLA timer not pausing on "Waiting on Customer" status.
```
