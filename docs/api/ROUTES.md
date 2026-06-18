# API routes

Paths are defined in [packages/contracts/src/routes.ts](../../packages/contracts/src/routes.ts). DTOs live in [packages/contracts/src/dto/](../../packages/contracts/src/dto/).

**Auth:** Unless noted, routes require `JwtAuthGuard` + `X-Workspace-Id`.

**Pagination:** Several list routes accept `page`, `limit`, and optional `search`. Responses use `{ items, page, limit, total, totalPages }`. See [OVERVIEW.md](./OVERVIEW.md#pagination).

## Health

| Method | Path      | Roles | DTO | Controller                                                                                    |
| ------ | --------- | ----- | --- | --------------------------------------------------------------------------------------------- |
| GET    | `/health` | —     | —   | [health.controller.ts](../../apps/api/src/modules/health/interface/http/health.controller.ts) |

## Auth

| Method | Path                     | Roles  | DTO                                                         | Controller                                                                              |
| ------ | ------------------------ | ------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| POST   | `/auth/register`         | —      | [auth.dto.ts](../../packages/contracts/src/dto/auth.dto.ts) | [auth.controller.ts](../../apps/api/src/modules/auth/interface/http/auth.controller.ts) |
| POST   | `/auth/login`            | —      | auth.dto                                                    | auth.controller                                                                         |
| POST   | `/auth/refresh`          | Cookie | —                                                           | auth.controller                                                                         |
| POST   | `/auth/switch-workspace` | Auth   | auth.dto                                                    | auth.controller                                                                         |
| GET    | `/auth/me`               | Auth   | —                                                           | auth.controller                                                                         |
| DELETE | `/auth/logout`           | —      | —                                                           | auth.controller                                                                         |

## Users

| Method | Path                     | Roles | DTO                                                                         | Controller                                                                                 |
| ------ | ------------------------ | ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/users/me`              | Auth  | [user-profile.dto.ts](../../packages/contracts/src/dto/user-profile.dto.ts) | [users.controller.ts](../../apps/api/src/modules/users/interface/http/users.controller.ts) |
| PATCH  | `/users/me`              | Auth  | user-profile.dto                                                            | users.controller                                                                           |
| PATCH  | `/users/me/preferences`  | Auth  | user-profile.dto                                                            | users.controller                                                                           |
| POST   | `/users/me/password`     | Auth  | user-profile.dto                                                            | users.controller                                                                           |
| GET    | `/users/me/sessions`     | Auth  | user-profile.dto                                                            | users.controller                                                                           |
| DELETE | `/users/me/sessions/:id` | Auth  | —                                                                           | users.controller                                                                           |
| POST   | `/users/me/2fa/enable`   | Auth  | user-profile.dto                                                            | users.controller                                                                           |
| POST   | `/users/me/2fa/verify`   | Auth  | user-profile.dto                                                            | users.controller                                                                           |
| POST   | `/users/me/2fa/disable`  | Auth  | user-profile.dto                                                            | users.controller                                                                           |

## Workspaces

| Method | Path                               | Roles | DTO                                                                   | Controller                                                                                             |
| ------ | ---------------------------------- | ----- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/workspaces`                      | Auth  | —                                                                     | [workspace.controller.ts](../../apps/api/src/modules/workspace/interface/http/workspace.controller.ts) |
| GET    | `/workspaces/:id/members`          | Auth  | —                                                                     | workspace.controller                                                                                   |
| GET    | `/workspaces/:id/members/overview` | ADMIN | paginated team overview                                               | workspace.controller                                                                                   |
| POST   | `/workspaces/:id/members/invite`   | ADMIN | [workspace.dto.ts](../../packages/contracts/src/dto/workspace.dto.ts) | workspace.controller                                                                                   |

## Projects and team invites

| Method | Path                                          | Roles | DTO                                                               | Controller                                                                                                  |
| ------ | --------------------------------------------- | ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| GET    | `/projects`                                   | Auth  | —                                                                 | [projects.controller.ts](../../apps/api/src/modules/projects/interface/http/projects.controller.ts)         |
| POST   | `/projects`                                   | ADMIN | [project.dto.ts](../../packages/contracts/src/dto/project.dto.ts) | projects.controller                                                                                         |
| GET    | `/projects/:id`                               | Auth  | —                                                                 | projects.controller                                                                                         |
| PATCH  | `/projects/:id`                               | ADMIN | project.dto                                                       | projects.controller                                                                                         |
| DELETE | `/projects/:id`                               | ADMIN | —                                                                 | projects.controller                                                                                         |
| GET    | `/projects/:id/team`                          | ADMIN | —                                                                 | projects.controller                                                                                         |
| PATCH  | `/projects/:projectId/team/members/:memberId` | ADMIN | team.dto                                                          | projects.controller                                                                                         |
| DELETE | `/projects/:projectId/team/members/:memberId` | ADMIN | —                                                                 | projects.controller                                                                                         |
| POST   | `/projects/:id/team/invites`                  | ADMIN | team.dto                                                          | projects.controller                                                                                         |
| GET    | `/team-invites/:token`                        | —     | —                                                                 | [team-invites.controller.ts](../../apps/api/src/modules/projects/interface/http/team-invites.controller.ts) |
| POST   | `/team-invites/:token/accept`                 | Auth  | —                                                                 | team-invites.controller                                                                                     |

## Categories

| Method | Path              | Roles | DTO                                                                 | Controller                                                                                                |
| ------ | ----------------- | ----- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| GET    | `/categories`     | Auth  | [category.dto.ts](../../packages/contracts/src/dto/category.dto.ts) | [categories.controller.ts](../../apps/api/src/modules/categories/interface/http/categories.controller.ts) |
| POST   | `/categories`     | ADMIN | category.dto                                                        | categories.controller                                                                                     |
| PATCH  | `/categories/:id` | ADMIN | category.dto                                                        | categories.controller                                                                                     |
| DELETE | `/categories/:id` | ADMIN | —                                                                   | categories.controller                                                                                     |

List responses are paginated (`page`, `limit`, `search`).

## Tasks

| Method | Path         | Roles | DTO                                                         | Controller                                                                                 |
| ------ | ------------ | ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/tasks`     | Auth  | [task.dto.ts](../../packages/contracts/src/dto/task.dto.ts) | [tasks.controller.ts](../../apps/api/src/modules/tasks/interface/http/tasks.controller.ts) |
| POST   | `/tasks`     | Auth  | task.dto                                                    | tasks.controller                                                                           |
| PATCH  | `/tasks/:id` | Auth  | task.dto                                                    | tasks.controller                                                                           |
| DELETE | `/tasks/:id` | Auth  | —                                                           | tasks.controller                                                                           |

## Time logs

| Method | Path                  | Roles         | DTO                                                                                   | Controller                                                                                          |
| ------ | --------------------- | ------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/timelogs`           | Auth          | [timelog.dto.ts](../../packages/contracts/src/dto/timelog.dto.ts)                     | [timelogs.controller.ts](../../apps/api/src/modules/timelogs/interface/http/timelogs.controller.ts) |
| GET    | `/timelogs/occupancy` | Auth (member) | [timelog-occupancy.dto.ts](../../packages/contracts/src/dto/timelog-occupancy.dto.ts) | timelogs.controller                                                                                 |
| POST   | `/timelogs`           | Auth          | timelog.dto                                                                           | timelogs.controller                                                                                 |
| PATCH  | `/timelogs/:id`       | Auth          | timelog.dto                                                                           | timelogs.controller                                                                                 |
| DELETE | `/timelogs/:id`       | Auth          | —                                                                                     | timelogs.controller                                                                                 |

## Timer

| Method | Path            | Roles | DTO                                                           | Controller                                                                                 |
| ------ | --------------- | ----- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| POST   | `/timer/start`  | Auth  | [timer.dto.ts](../../packages/contracts/src/dto/timer.dto.ts) | [timer.controller.ts](../../apps/api/src/modules/timer/interface/http/timer.controller.ts) |
| POST   | `/timer/stop`   | Auth  | —                                                             | timer.controller                                                                           |
| GET    | `/timer/active` | Auth  | —                                                             | timer.controller                                                                           |

## Billing

| Method | Path               | Roles | DTO                                                                   | Controller                                                                                       |
| ------ | ------------------ | ----- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/billing/rates`   | ADMIN | —                                                                     | [billing.controller.ts](../../apps/api/src/modules/billing/interface/http/billing.controller.ts) |
| POST   | `/billing/rates`   | ADMIN | [billing.dto.ts](../../packages/contracts/src/dto/billing.dto.ts)     | billing.controller                                                                               |
| GET    | `/billing/summary` | ADMIN | [reporting.dto.ts](../../packages/contracts/src/dto/reporting.dto.ts) | billing.controller                                                                               |

## Reporting

| Method | Path                             | Roles         | DTO              | Controller                                                                                                   |
| ------ | -------------------------------- | ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/reporting/dashboard`           | ADMIN         | reporting.dto    | reporting.controller                                                                                         |
| GET    | `/reporting/me`                  | ADMIN, MEMBER | reporting.dto    | reporting.controller                                                                                         |
| GET    | `/reporting/categories-heatmap`  | ADMIN         | reporting.dto    | reporting.controller                                                                                         |
| GET    | `/reporting/utilization`         | ADMIN         | paginated        | reporting.controller                                                                                         |
| POST   | `/reporting/widget-shares`       | ADMIN         | widget-share.dto | reporting.controller                                                                                         |
| GET    | `/reporting/widget-share/:token` | Public        | widget-share.dto | [widget-share.controller.ts](../../apps/api/src/modules/reporting/interface/http/widget-share.controller.ts) |

## Presence

| Method | Path                 | Roles | DTO | Controller                                                                                          |
| ------ | -------------------- | ----- | --- | --------------------------------------------------------------------------------------------------- |
| GET    | `/presence/snapshot` | ADMIN | —   | [presence.controller.ts](../../apps/api/src/modules/presence/interface/http/presence.controller.ts) |
| GET    | `/presence/stream`   | ADMIN | —   | presence.controller (SSE)                                                                           |

## Export

| Method                | Path                   | Roles         | DTO                       | Controller                                                                                                |
| --------------------- | ---------------------- | ------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| POST                  | `/export`              | ADMIN         | export.dto                | [export.controller.ts](../../apps/api/src/modules/export/interface/http/export.controller.ts)             |
| POST                  | `/export/preview`      | ADMIN         | export.dto (preview body) | export.controller                                                                                         |
| GET                   | `/export`              | ADMIN         | export.dto (query)        | export.controller                                                                                         |
| POST                  | `/export/me`           | ADMIN, MEMBER | export.dto (member body)  | export.controller                                                                                         |
| GET/POST/DELETE       | `/export/presets` …    | ADMIN         | export.dto                | export.controller                                                                                         |
| GET/POST/PATCH/DELETE | `/export/schedules` …  | ADMIN         | export.dto                | export.controller                                                                                         |
| POST                  | `/export/shares`       | ADMIN         | export.dto                | export.controller                                                                                         |
| GET                   | `/export/share/:token` | Public        | —                         | [export-share.controller.ts](../../apps/api/src/modules/export/interface/http/export-share.controller.ts) |

`POST /export` and legacy `GET /export` return binary attachments with `Content-Disposition`.

## Maintenance

When adding a route:

1. Add path to `packages/contracts/src/routes.ts`
2. Add Zod schemas to the appropriate `dto/*.ts`
3. Implement controller method
4. Update this file and the relevant [feature spec](../specs/)
