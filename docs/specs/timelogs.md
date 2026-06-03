# Time logs spec

## User-visible outcome

- **Members** create, edit, and delete their own manual time entries on assigned projects.
- **Admins** can list and filter all members’ logs and edit/delete any entry in the workspace.

## API

| Method | Route           | Contract                                                          |
| ------ | --------------- | ----------------------------------------------------------------- |
| GET    | `/timelogs`     | [timelog.dto.ts](../../packages/contracts/src/dto/timelog.dto.ts) |
| POST   | `/timelogs`     | timelog.dto                                                       |
| PATCH  | `/timelogs/:id` | timelog.dto                                                       |
| DELETE | `/timelogs/:id` | timelog.dto                                                       |

Controller: [timelogs.controller.ts](../../apps/api/src/modules/timelogs/interface/http/timelogs.controller.ts)

## Given / When / Then

### List

**Given** an authenticated user in a workspace  
**When** they GET `/timelogs` with optional `from`, `to`, `taskId`, `userId`  
**Then**

- **MEMBER:** only their logs are returned (`userId` filter ignored).
- **ADMIN:** all workspace logs; optional `userId` filter applies.

### Create manual entry

**Given** a task in a project the user can access  
**When** they POST `/timelogs` with `startTime`, `endTime`, optional `description`, `isBillable`  
**Then** a log is created with `source: manual` and `durationSec` computed from the interval.

### Overlap protection

**When** start/end overlaps another log for the same user  
**Then** the API returns a validation/conflict error.

### Update / delete

**When** a member PATCHes or DELETEs a log they do not own  
**Then** `403 FORBIDDEN`.

**When** updating times  
**Then** overlap rules apply again.

### Timer-sourced entries

Entries created via `POST /timer/stop` have `source: timer`. Product intent: timer entries should not be edited via PATCH (see [timer.md](./timer.md)); enforce in UI by disabling edit for `source === "timer"`.

## UI

- Client: [apps/client/src/app/(workspace)/timesheet/page.tsx](<../../apps/client/src/app/(workspace)/timesheet/page.tsx>)

## Edge cases

- Task must belong to a project in the active workspace.
- Date range filters use interval overlap (`startTime` / `endTime`).
