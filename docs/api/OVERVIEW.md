# API overview

Base URL (local): `http://localhost:3001`

## Request conventions

- **Content-Type:** `application/json` for bodies unless downloading exports (binary response).
- **Authentication:** `Authorization: Bearer <accessToken>` on protected routes.
- **Workspace:** `X-Workspace-Id: <uuid>` on protected routes (must match token workspace or override per guard rules).
- **Cookies:** `credentials: "include"` from browsers for refresh and optional cookie-based access.

## Validation

Request bodies and query params are validated with Zod schemas from `@chronomint/contracts` via `ZodValidationPipe`. Invalid input returns **400** with a structured error.

## Error shape

Domain errors use `DomainException` with contract `ErrorCodes`, for example:

| Code                 | Typical HTTP status |
| -------------------- | ------------------- |
| `UNAUTHORIZED`       | 401                 |
| `FORBIDDEN`          | 403                 |
| `NOT_FOUND`          | 404                 |
| `WORKSPACE_REQUIRED` | 401                 |
| `VALIDATION_ERROR`   | 400                 |

## Scoping

- Data is always limited to the active workspace.
- Members see only projects where they are on the project **team** (unless workspace `ADMIN`).
- Time logs are tied to tasks; tasks to projects; projects to workspaces.

## Pagination

List endpoints return full result sets for v1 (no cursor pagination). Keep date ranges reasonable on `timelogs` and exports.

## Module boundaries

The API is split into Nest feature modules under `apps/api/src/modules/`. Modules do not import each other’s internals — shared logic lives in `common/` or shared services (e.g. time aggregation for reporting and export).

## Contracts as SSOT

- Route paths: `packages/contracts/src/routes.ts`
- DTOs: `packages/contracts/src/dto/*.dto.ts`

When the API changes, update contracts first, then controllers and frontends.

## Health

`GET /health` — no auth. Used for load balancers and smoke tests.

## Full route list

See [ROUTES.md](./ROUTES.md).
