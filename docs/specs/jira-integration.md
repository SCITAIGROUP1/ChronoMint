# Jira Integration

Connects a Kloqra workspace to a Jira Cloud site via OAuth 2.0 (3LO). Once connected, admins can map projects and users, sync issues into Kloqra, and push time-log entries back to Jira as worklogs. Members can view their assigned Jira issues directly from the client app.

---

## What this integration does

| Feature                                | Who uses it | Where                        |
| -------------------------------------- | ----------- | ---------------------------- |
| Connect / disconnect workspace to Jira | Admin       | Admin app → Jira → Settings  |
| Map Jira projects to Kloqra projects   | Admin       | Admin app → Jira → Projects  |
| Sync Jira issues into local cache      | Admin       | Admin app → Jira → Issues    |
| Map Jira users to workspace members    | Admin       | Admin app → Jira → Users     |
| Push time logs to Jira as worklogs     | Admin       | Admin app → Jira → Worklogs  |
| View sync audit log                    | Admin       | Admin app → Jira → Sync Logs |
| View issues assigned to me             | Member      | Client app → Jira            |

---

## Architecture

```
Atlassian OAuth 2.0 (3LO)
        │
        ▼
JiraAuthService         — stores access/refresh tokens per workspace in JiraConnection
JiraApiService          — low-level REST client (auto-refreshes tokens)
JiraProjectsService     — project listing + project-to-project mappings
JiraIssuesService       — paginated sync into JiraIssueCache, "my issues" live fetch
JiraUsersService        — user listing, email auto-match, manual mapping
JiraWorklogsService     — push pending/failed timelogs to Jira REST API
JiraSyncLogService      — audit trail for every sync operation
```

The OAuth callback is a **public** endpoint (no JWT required). Every other Jira endpoint requires `JwtAuthGuard`. Admin-only endpoints additionally require `RolesGuard` with `ADMIN` role.

---

## Data model

Six new tables are added by migration `20260611221041_add_jira_integration`.

| Table                | Purpose                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| `JiraConnection`     | One per workspace — stores cloudId, site URL, access/refresh tokens, expiry           |
| `JiraProjectMapping` | Links a Jira project (`jiraProjectId`) to a Kloqra project (`projectId`)              |
| `JiraUserMapping`    | Links a Jira account (`jiraAccountId`) to a workspace member (`userId`)               |
| `JiraIssueCache`     | Local copy of Jira issues pulled via sync (avoid hitting Jira API on every page load) |
| `JiraWorklogSync`    | Tracks push status (`PENDING` / `SUCCESS` / `FAILED`) for each TimeLog                |
| `JiraSyncLog`        | Audit log — one row per sync operation with status and metadata                       |

---

## API routes

All routes live under `JiraController` (`@Controller()`). With no global prefix in `main.ts`, paths are relative to the API root.

| Method   | Path                          | Auth       | Description                                          |
| -------- | ----------------------------- | ---------- | ---------------------------------------------------- |
| `GET`    | `/jira/auth/status`           | Admin      | Connection status for current workspace              |
| `GET`    | `/jira/auth/connect`          | Admin      | Returns Atlassian OAuth URL to redirect user to      |
| `GET`    | `/jira/auth/callback`         | **Public** | Atlassian redirects here after authorization         |
| `DELETE` | `/jira/auth/disconnect`       | Admin      | Revokes tokens and removes connection                |
| `GET`    | `/jira/projects`              | Admin      | Lists Jira projects on the connected site            |
| `GET`    | `/jira/projects/mappings`     | Admin      | Lists saved project mappings                         |
| `POST`   | `/jira/projects/mappings`     | Admin      | Create or update a project mapping                   |
| `DELETE` | `/jira/projects/mappings/:id` | Admin      | Remove a project mapping                             |
| `POST`   | `/jira/projects/sync`         | Admin      | Pull issues from Jira into local cache               |
| `GET`    | `/jira/issues`                | Admin      | List cached issues (paginated, filterable)           |
| `GET`    | `/jira/issues/my`             | Member     | Issues assigned to the current user (live from Jira) |
| `GET`    | `/jira/users`                 | Admin      | List users on the connected Jira site                |
| `GET`    | `/jira/users/mappings`        | Admin      | List saved user mappings                             |
| `POST`   | `/jira/users/auto-map`        | Admin      | Auto-match Jira users to members by email            |
| `POST`   | `/jira/users/mappings`        | Admin      | Manually set a user mapping                          |
| `GET`    | `/jira/worklogs`              | Admin      | List timelogs with their Jira sync status            |
| `POST`   | `/jira/worklogs/sync`         | Admin      | Push all PENDING / FAILED timelogs to Jira           |
| `GET`    | `/jira/logs`                  | Admin      | Paginated sync audit log                             |

---

## Atlassian app configuration

The OAuth app must be registered at [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps).

**Required scopes:**

```
read:jira-work
write:jira-work
read:jira-user
read:account
offline_access
```

**Callback URLs to register (both):**

```
http://localhost:3001/jira/auth/callback          ← local development
https://chronomintapi-production.up.railway.app/jira/auth/callback  ← production
```

> Note: `offline_access` is needed to get a refresh token so the connection stays alive without re-authorizing.

---

## Environment variables

### API (`apps/api/.env`)

These 4 variables must be added. Never commit `.env` — add them to Railway Variables for production.

| Variable             | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `JIRA_CLIENT_ID`     | OAuth app Client ID from Atlassian Developer Console                  |
| `JIRA_CLIENT_SECRET` | OAuth app Client Secret (keep secret — never expose to frontend)      |
| `JIRA_REDIRECT_URI`  | Must exactly match a registered callback URL in the Atlassian console |
| `JIRA_SCOPES`        | Space-separated scopes (see above)                                    |

**Local dev example (`apps/api/.env`):**

```
JIRA_CLIENT_ID=your-client-id
JIRA_CLIENT_SECRET=your-client-secret
JIRA_REDIRECT_URI=http://localhost:3001/jira/auth/callback
JIRA_SCOPES=read:jira-work write:jira-work read:jira-user read:account offline_access
```

**Production (Railway Variables):**

```
JIRA_REDIRECT_URI=https://chronomintapi-production.up.railway.app/jira/auth/callback
```

### Frontend apps

Add to Vercel Environment Variables (or `.env.local` for local dev):

| App    | Variable                   | Value  |
| ------ | -------------------------- | ------ |
| Client | `NEXT_PUBLIC_JIRA_ENABLED` | `true` |
| Admin  | `NEXT_PUBLIC_JIRA_ENABLED` | `true` |

---

## Local development setup

1. **Register the Atlassian app** (once, done by the person responsible for Jira integration)
   - Create app at [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps)
   - Add both callback URLs listed above
   - Grant the 5 scopes listed above

2. **Add env vars** to `apps/api/.env`:

   ```
   JIRA_CLIENT_ID=...
   JIRA_CLIENT_SECRET=...
   JIRA_REDIRECT_URI=http://localhost:3001/jira/auth/callback
   JIRA_SCOPES=read:jira-work write:jira-work read:jira-user read:account offline_access
   ```

3. **Add env vars** to `apps/admin/.env.local` and `apps/client/.env.local`:

   ```
   NEXT_PUBLIC_JIRA_ENABLED=true
   ```

4. **Run migration** (if not already run):

   ```bash
   pnpm prisma:migrate
   ```

5. **Start dev servers:**

   ```bash
   pnpm dev
   ```

6. **Connect Jira:** Log in as `admin@kloqra.dev` → Admin app → **Jira → Settings** → **Connect to Jira**

---

## Production deployment

Migrations run **automatically** on Railway deploy via `docker-entrypoint.sh` (`prisma migrate deploy`). No manual steps needed for the database.

**Checklist before merging to main:**

- [ ] Atlassian console has the production callback URL registered
- [ ] Railway Variables has all 4 `JIRA_*` variables set
- [ ] Vercel Environment Variables for admin and client have `NEXT_PUBLIC_JIRA_ENABLED=true`
- [ ] Migration file `20260611221041_add_jira_integration` is committed

**After deploy:**

1. Log into production admin app
2. Jira → Settings → Connect to Jira
3. Jira → Projects → map Jira projects to Kloqra projects + enable sync
4. Jira → Users → click **Auto-match by Email** (maps users who share the same email in both systems)
5. Jira → Projects → **Sync All** to pull issues into cache

---

## Admin usage guide

### Settings tab

Shows connection status. Click **Connect to Jira** to start OAuth flow. After authorizing on Atlassian, you are redirected back to this page with a success banner. Click **Disconnect** to revoke access.

### Projects tab

Lists all Jira projects on the connected site. For each project, select the corresponding Kloqra project from the dropdown and save. Toggle **Sync enabled** to include/exclude it from issue sync. Click **Sync All** to pull the latest issues.

### Issues tab

Paginated view of issues pulled from Jira. Use the search box to filter by key or summary. Issues are cached locally — click **Sync** from the Projects tab to refresh.

### Users tab

Lists all Jira users. Use the **Auto-match by Email** button to automatically link Jira users to Kloqra members who share the same email address. For accounts with different emails, use the dropdown to map them manually.

### Worklogs tab

Shows all time log entries and their Jira push status (`PENDING`, `SUCCESS`, `FAILED`). Click **Push Pending** to send all outstanding entries to Jira as worklogs.

### Sync Logs tab

Audit trail of every sync operation. Filter by status (`SUCCESS`, `FAILED`, `PARTIAL`) to investigate issues.

---

## Member usage guide

Members see a **Jira** item in the left sidebar of the client app. This page shows all Jira issues currently assigned to them (fetched live from Jira using their user mapping).

Requires:

- Admin has connected the workspace to Jira
- Admin has mapped the member's Kloqra account to their Jira account (Users tab)

The **Start Timer** button on each issue will start a timer pre-linked to that issue (coming in a future release).

---

## OAuth flow diagram

```
User clicks "Connect to Jira"
        │
        ▼
GET /jira/auth/connect  (Admin, JWT required)
        │  returns { authUrl } — includes JWT-signed state param with workspaceId
        ▼
Browser redirects to auth.atlassian.com/authorize
        │
        ▼
User approves scopes on Atlassian
        │
        ▼
Atlassian redirects to /jira/auth/callback?code=...&state=...  (Public endpoint)
        │  verifies state JWT, exchanges code for tokens, saves JiraConnection
        ▼
Browser redirected to /jira/settings?connected=true  (Admin app)
```

---

## Token refresh

`JiraAuthService.getValidToken()` is called before every Jira API request. If the access token expires in less than 5 minutes, it automatically uses the refresh token to get a new pair and updates the database. The `offline_access` scope is required for this to work.

---

## Notes

- **One Jira connection per workspace.** Different workspaces can connect to different Jira sites.
- **The callback URL must exactly match** what is registered in the Atlassian console. A mismatch causes a 404 after OAuth redirect (no `/api/` prefix — the API has no global prefix).
- **`offline_access` scope is mandatory.** Without it, the connection expires after 1 hour and users must re-authorize.
- **Issue cache vs live fetch.** `GET /jira/issues` reads from the local cache (fast). `GET /jira/issues/my` fetches live from Jira using the user's Jira account ID from their mapping.
