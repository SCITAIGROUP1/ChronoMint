# User guides

Step-by-step help for Kloqra. No technical setup required.

## One product, capability-driven experiences

Everyone signs in to the same product URL (local: http://localhost:3000). Kloqra shows personal and
management features from your effective tenant, workspace, and project capabilities.

| Persona            | What is added to the shared product                                      |
| ------------------ | ------------------------------------------------------------------------ |
| Member             | Timer, timesheet, submissions, assigned projects/tasks, profile/settings |
| Project manager    | Management actions for assigned projects only                            |
| Workspace admin    | Workspace-wide projects, team, approvals, reports, rates, and exports    |
| Tenant owner/admin | Authorized organization controls under `/account/*`                      |

Demo passwords (after seed): `password123`

| Account             | Use for                         |
| ------------------- | ------------------------------- |
| `member@kloqra.dev` | Personal member experience      |
| `admin@kloqra.dev`  | Workspace management experience |

Default workspace after seed: **Acme Corporation** (switch workspaces from the sidebar if needed).

## Personal member workflows

1. [Getting started](member/getting-started.md)
2. [Timer and timesheet](member/timer-and-timesheet.md)
3. [Timesheet submissions and approval](timesheet-submissions-and-approval.md) — submit, review, and what happens when settings change
4. [Export my data](member/export-my-data.md)
5. [Profile and settings](member/profile-and-settings.md)

## Management workflows

1. [Getting started](management/getting-started.md)
2. [Projects and teams](management/projects-and-teams.md)
3. [Timesheet submissions and approval](timesheet-submissions-and-approval.md) — enable approval, review, reminders, edit requests
4. [Dashboard and team live](management/dashboard-and-team-live.md)
5. [Billing](management/billing.md)
6. [Exports](management/exports.md)
7. [Public reporting API](management/public-reporting-api.md) — API keys for third-party clients

Profile and settings are shared personal routes for every persona — see
[member/profile-and-settings.md](member/profile-and-settings.md).

## QA (testing)

For testers and QA engineers — setup from scratch, manual checklists, automated tests, and sign-off:

- **[QA testing guide](qa/testing-guide.md)** — start here if you are non-technical QA

## Presentations

- **[40-minute technical demo script](demo-40min-script.md)** — live demo + architecture + agentic development (presenters)
- **[Slide deck PDF](../presentations/kloqra-demo-and-roadmap.pdf)** — 26-slide PDF (demo + roadmap); [source & PPTX export](../presentations/README.md)

## More for developers

See the [documentation hub](../README.md).
