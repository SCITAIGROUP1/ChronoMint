---
name: epic-story-breakdown
description: Framework for decomposing heavy applications or large features into manageable Epics, User Stories, and Technical Tasks. Use this when the user wants to plan a new app, module, or large feature set.
---

# Epic, Story, and Task Breakdown Skill

When a user asks you to break down a large application or feature set, your job is to act as an Agile Architect. You must decompose the heavy requirements into a hierarchical structure: **Epics -> Stories -> Tasks**.

## The Hierarchy Definitions

1. **Epic (The Module):** A large body of work that can be broken down into specific tasks. It represents a major feature or module of the application (e.g., "User Authentication", "Payment Gateway", "Admin Dashboard"). Epics usually take several sprints to complete.
2. **User Story (The Value):** A piece of the Epic written from the user's perspective. It represents a single, testable vertical slice of value (e.g., "As a user, I can log in with Google", "As an admin, I can view a list of all users"). A story should be small enough to complete in a few days.
3. **Task / Sub-task (The Implementation):** The highly technical steps required for the developer to actually build the User Story. (e.g., "Create the `users` table migration", "Implement OAuth2 callback endpoint", "Build the Login UI React component").

## Output Format

When generating a breakdown, format your response beautifully using Markdown lists, bolding, and structure. Use the following template:

```markdown
# 🏗️ Application Breakdown: [Application Name]

## 📦 Epic 1: [Name of Epic, e.g., User Management]
*Description: A brief summary of what this Epic covers.*

*   ### 📘 Story 1.1: [Story Title, e.g., Email/Password Registration]
    **User Story:** As a [Persona], I want to [Action] so that [Value].
    *   **Task 1.1.1 (Backend):** [Technical task description]
    *   **Task 1.1.2 (Frontend):** [Technical task description]
    *   **Task 1.1.3 (QA/Config):** [Technical task description]

*   ### 📘 Story 1.2: [Story Title, e.g., Password Reset]
    **User Story:** As a [Persona], I want to [Action] so that [Value].
    *   **Task 1.2.1 (Backend):** [Technical task description]
    *   **Task 1.2.2 (Frontend):** [Technical task description]

## 📦 Epic 2: [Name of Epic, e.g., Checkout Flow]
*Description: A brief summary of what this Epic covers.*
...(continue the pattern)
```

## Critical Rules for Breakdown
1. **Vertical Slices:** Stories must be vertical slices of value. Do NOT create a story like "Build all the database tables." Instead, the story should be "User Registration", and the database table is just a Task under that story.
2. **MECE Principle:** Ensure your breakdown is Mutually Exclusive (no overlapping stories) and Collectively Exhaustive (covers all requirements given by the user).
3. **Next Steps:** Always conclude your breakdown by reminding the user that they can now invoke the `ProductManager` or `GitHubProjectManager` to transform any specific Story from the list into a full, detailed Jira/GitHub ticket.
