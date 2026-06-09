# User profile and preferences spec

## User-visible outcome

- Any authenticated user can view and update their **profile** (display name), **preferences** (daily target, timezone, week start), and **password**.
- Preferences are stored per user and sync across devices.
- Workspace settings remain admin-only org defaults; user preferences override where set.

## API

| Method | Route                   | Contract                                                                    | Roles |
| ------ | ----------------------- | --------------------------------------------------------------------------- | ----- |
| GET    | `/users/me`             | [user-profile.dto.ts](../../packages/contracts/src/dto/user-profile.dto.ts) | Auth  |
| PATCH  | `/users/me`             | `updateUserProfileSchema`                                                   | Auth  |
| PATCH  | `/users/me/preferences` | `updateUserPreferencesSchema`                                               | Auth  |
| POST   | `/users/me/password`    | `changePasswordSchema`                                                      | Auth  |

Controller: `apps/api/src/modules/users/interface/http/users.controller.ts`

## Given / When / Then

### Get profile

**When** authenticated GET `/users/me`  
**Then** returns user id, email, name, defaultHourlyRate, preferences, effectiveDailyTargetHours, createdAt.

### Update name

**When** PATCH `/users/me` with `{ name }`  
**Then** name is updated and profile returned.

### Update preferences

**When** PATCH `/users/me/preferences` with partial preferences  
**Then** preferences are merged into `users.preferences` JSON.

### Change password

**When** POST `/users/me/password` with valid current and new password  
**Then** password is updated and all refresh tokens for the user are revoked.

**When** current password is wrong  
**Then** 401 unauthorized.

### Impersonation

**When** admin is impersonating a member  
**Then** PATCH/POST on `/users/me*` are forbidden.

## Security

- Scope by JWT `userId` only.
- Throttle password endpoint (5/min).
- `defaultHourlyRate` is read-only via profile API.

## UI

- Client: `/settings`
- Admin: `/settings`
- Shared: `@chronomint/web-shared` AccountSettingsPage
