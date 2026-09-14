# Non-project time (holidays, leave, tenant activities)

## User-visible outcome

- **Members** log public holidays, full-day leave, half-day leave, and organization activities (office event, office meeting, custom types) **without a project**.
- **Organization owner / org admin** maintain one holiday calendar and one activity-type catalog for the tenant. Catalogs appear in **every workspace**.
- **Timesheet and occupancy** show these entries on the same timeline as project work, with distinct styling.
- **Export and dashboard** can include, exclude, or show only non-project time. Invoice reports always exclude it.
- Leave entitlement, balances, accrual, and approval workflows are **out of scope**.

## Duration

Effective daily hours: user preference → workspace `dailyTargetHours` → **8**.

Holiday, leave, and activity entries use the same **start / end / duration** pickers as project work. Switching to a full-day or half-day type **prefills** duration from daily hours (`dayHours` or `dayHours / 2`); the member can then change the clock times. If a write omits `endTime`, the API still applies that default duration from the given `startTime`.

| Kind                            | Default hours      |
| ------------------------------- | ------------------ |
| Public holiday / full-day leave | `dayHours`         |
| Half-day leave                  | `dayHours / 2`     |
| Tenant activity                 | Explicit start/end |

Duration is stored on the time log from the chosen start and end.

## API

| Method                | Route                                 | Who                                                                  |
| --------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| GET                   | `/timelogs/holidays`                  | Workspace member (list tenant holidays)                              |
| GET                   | `/timelogs/activity-types`            | Workspace member (list tenant activity types)                        |
| POST / PATCH / DELETE | `/timelogs`                           | Same as today; `classification` selects project vs non-project       |
| GET / POST            | `/tenants/current/holidays`           | Org owner / org admin                                                |
| PATCH / DELETE        | `/tenants/current/holidays/:id`       | Org owner / org admin                                                |
| POST                  | `/tenants/current/holidays/:id/apply` | Org owner / org admin — one `PUBLIC_HOLIDAY` log per eligible member |
| GET / POST            | `/tenants/current/activity-types`     | Org owner / org admin                                                |
| PATCH / DELETE        | `/tenants/current/activity-types/:id` | Org owner / org admin (system types not deletable)                   |

Contracts: [non-project-time.dto.ts](../../packages/contracts/src/dto/non-project-time.dto.ts), [timelog.dto.ts](../../packages/contracts/src/dto/timelog.dto.ts).

## Given / When / Then

**Given** a workspace member  
**When** they POST `/timelogs` with `classification: LEAVE_FULL` and `startTime`  
**Then** a non-billable log is created with `taskId` null. Duration defaults to effective daily hours when `endTime` is omitted; otherwise start and end are stored as sent. The log occupies the user timeline.

**Given** a public holiday on the tenant calendar  
**When** an org admin applies it to members  
**Then** each active tenant member with a workspace membership gets one `PUBLIC_HOLIDAY` log (conflicts skipped). The same log is visible from every workspace in the tenant.

**When** export or dashboard query sets `nonProjectTime=exclude`  
**Then** only `PROJECT` logs are included. Invoice reports always exclude non-project logs.

**When** a member starts a timer  
**Then** only `PROJECT` and `TENANT_ACTIVITY` are allowed (holiday/leave cannot be timed).

**Given** an existing holiday, leave, or organization-activity log  
**When** the member opens Edit time entry  
**Then** they can change type (Public / Full / Half / Other, or back to project work) and save. PATCH `/timelogs/:id` persists `classification` and clears or sets `taskId`, `activityTypeId`, and `holidayId` to match.

## Edge cases

- Non-project logs are not locked by per-project timesheet approval.
- When nonProjectTime is **only**, project / category / task filters are ignored.
- When nonProjectTime is **include**, those filters still apply to project rows; non-project rows remain.
- When nonProjectTime is **exclude**, only project rows are returned.
- System activity types **Organizational**, **Recreational**, **Office Event**, and **Office Meeting** are seeded per tenant and cannot be deleted.
- Overlap rules still apply across all of a user’s logs.
