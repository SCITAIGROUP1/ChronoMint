---
name: jira-ticket-writer
description: Templates and guidelines for writing high-quality Jira tickets for both Product Managers (Stories/Tasks) and QA Engineers (Bug Reports). Use this when the user asks to write a Jira ticket, bug report, or user story.
---

# Jira Ticket Writing Skill

When a user asks you to write a Jira ticket, determine if it is a **Development Task/Story** (written by a PM) or a **Bug Report** (written by QA).

Follow the templates below exactly.

## 1. Development Task / User Story (PM Perspective)

Use this format when designing a new feature, technical task, or user story.

### **[Project Key]** [Component] - Brief Summary

**Issue Type:** Story / Task
**Priority:** (Blocker, High, Medium, Low)
**Assignee:** (If known)
**Reporter:** (If known)
**Labels:** (e.g., frontend, backend, database)

#### Description

**User Story:**
As a [User Persona],
I want to [Action/Feature]
So that [Benefit/Value].

**Context / Motivation:**
(Why are we doing this? What problem does it solve?)

**Acceptance Criteria:**
(Must be testable conditions)
*   **AC1:** ...
*   **AC2:** ...

**Technical / Developer Scope:**
(Technical notes, DB schema changes, API endpoints, etc.)

**Out of Scope:**
(What is explicitly NOT included in this ticket)

---

## 2. Bug Report (QA Perspective)

Use this format when reporting a defect or issue found during testing.

### **[Project Key]** [Component] - Concise summary of the bug

**Issue Type:** Bug
**Priority:** (Blocker, High, Medium, Low)
**Assignee:** (If known)
**Reporter:** (If known)
**Linked Issues:** (Link to the original Story/Task)

#### Description

**Environment:**
*   **App Version:** (e.g., v1.0.0)
*   **OS/Browser:** (e.g., macOS / Chrome)
*   **User Role:** (e.g., Admin)

**Pre-conditions:**
(State of the application required before starting the test)

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Result:**
(What should have happened, referencing Acceptance Criteria if possible)

**Actual Result:**
(What actually happened, including any error messages)

**Attachments:**
(Mention where to attach videos, screenshots, or logs)

**Additional Context:**
(Any other helpful info, edge cases, or workarounds)
