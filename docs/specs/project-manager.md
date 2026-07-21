# Project manager role — F17

## Persona and binding

A project manager is an active workspace member with
`team_members.role = PROJECT_MANAGER` on one or more projects. `PROJECT_MANAGER` is the canonical
role name; `LEAD` is obsolete terminology.

- The binding is resolved from the database for the requested project and is not trusted from a
  browser route or hidden-navigation state.
- A user may manage multiple projects in one workspace.
- A project-manager binding does not imply workspace-admin or tenant-admin authority.
- The unified product capability snapshot may include manageable project IDs as a UI hint, but the
  API reevaluates authorization for every protected request.

## Capabilities

| Action                                   | Project manager             | Workspace admin   |
| ---------------------------------------- | --------------------------- | ----------------- |
| Personal timer/timesheet/submissions     | Yes                         | Yes               |
| Tasks CRUD                               | Assigned projects only      | All projects      |
| Project team list/invite/add member      | Assigned projects only      | All projects      |
| Assign `PROJECT_MANAGER` role            | No                          | Yes               |
| Timesheet approve/reject/amendments      | Assigned projects only      | All projects      |
| Reporting dashboard and summaries        | Assigned projects only      | All projects      |
| Team live/presence                       | Assigned project teams only | Workspace-wide    |
| Projects/categories CRUD                 | No                          | Yes               |
| Workspace team, billing, export/API keys | No                          | Yes               |
| Tenant/account billing                   | No                          | Tenant owner only |

## Unified product experience

Project managers sign in to the same product URL and `app` auth scope as every member. There is no
persona or portal switch.

Their shell combines personal routes with scoped management:

- Dashboard, Timer, Timesheet, Submissions, Projects, Tasks, Time Tracker, Notifications, Profile,
  and Settings.
- Approvals and project-management actions for assigned projects.
- No workspace-wide Team Management, Categories, Billing, Exports, Workspace settings, or tenant
  account controls unless another effective role grants them.

`/dashboard` and `/projects` compose the authorized experience; entering a workspace-admin URL
directly must not broaden access.

## API enforcement

- Policy evaluation combines principal, action, project resource, workspace/tenant context, and
  active role bindings.
- Services scope list and mutation access to manageable project IDs.
- Project-manager assignment is allowed only to an authorized workspace admin, within the same
  tenant/workspace/project boundary.
- A user cannot grant itself broader access.
- Grant/revoke operations are audited with actor, target, role, scope, resource, reason, timestamp,
  and outcome.

### Key routes

| Route                                 | Project-manager access                       |
| ------------------------------------- | -------------------------------------------- |
| `POST/PATCH/DELETE /tasks`            | Assigned project only                        |
| `GET/POST/PATCH /projects/:id/team/*` | Assigned project; role assignment admin-only |
| `GET /timesheets/pending` etc.        | Filtered to assigned projects                |
| `PATCH /timesheets/:id/approve`       | Assigned project period only                 |
| `GET /reporting/dashboard` etc.       | Project-scoped                               |
| `GET /presence/snapshot`              | Assigned teams only                          |

## Assigning and revoking

A workspace admin updates the project team member role using
`PATCH /projects/:projectId/team/members/:memberId` with
`{ role: "PROJECT_MANAGER" | "MEMBER" }`.

Any project role change writes a user-revocation timestamp after the audited database change.
Access tokens issued before the change fail immediately with `session_revoked`; refresh-family rows
are not deleted by this role-change path. The product clears stale local state, and the user signs
in again to receive a capability snapshot reflecting the new role. This applies to both promotion
and demotion, so access does not linger until token expiry.

The same revocation semantics apply to workspace role changes. Ordinary logout remains
refresh-family scoped and does not log out unrelated devices.
