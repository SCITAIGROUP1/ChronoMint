# Management capabilities: Getting started

Use the same Kloqra product URL as every member (local: http://localhost:3000). Management
navigation and actions appear only when your effective project, workspace, or tenant roles allow
them.

## Sign in

1. Open the product **Login** page.
2. Sign in (workspace-admin demo: `admin@kloqra.dev` / `password123`).
3. A member account signs in at the same URL and receives the personal experience.

## Main areas

| Page               | Path                    | Purpose                                         |
| ------------------ | ----------------------- | ----------------------------------------------- |
| Dashboard          | `/dashboard`            | Configurable widgets; rearrange and save layout |
| Projects           | `/projects`             | Create and browse projects                      |
| Categories         | `/categories`           | Organize tasks into categories                  |
| Team management    | `/team-management`      | Invite workspace members, roles                 |
| Approvals          | `/approvals`            | Review submitted timesheets                     |
| Team live          | `/team`                 | Real-time who is tracking time                  |
| Billing            | `/billing`              | Hourly rates                                    |
| Exports            | `/exports`              | Reports, schedules, invoice wizard              |
| Workspace          | `/workspace`            | Org settings, create workspace                  |
| Profile / Settings | `/profile`, `/settings` | Your personal account                           |

Use the **workspace switcher** in the sidebar to change organization.

Project managers see only assigned projects and their authorized management actions. Tenant
owners/admins receive organization controls under `/account/*`; a tenant role does not
automatically grant operational access to every workspace.

## Global search

Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux), or click **Search…** in the top bar, to jump to
an authorized page or find accessible projects, tasks, categories, and team members.

## Typical first-day setup

1. **Workspace** — confirm timezone, week start, and approval defaults.
2. **Categories** — create categories before adding tasks.
3. **Projects** — create a project per client or work stream.
4. **Team management** — invite members by email.
5. **Project team** — open a project → Team tab → generate invite links for project access.
6. **Billing** — set hourly rates if you track amounts.
7. **Dashboard** — confirm members are logging time after a few days.

## Next steps

- [Projects and teams](projects-and-teams.md)
- [Dashboard and team live](dashboard-and-team-live.md)
- [Billing](billing.md)
- [Exports](exports.md)
