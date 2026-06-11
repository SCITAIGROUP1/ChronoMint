# Jira integration — local testing runbook

Covers Phases 1–3: API, deep link, Forge panel.

## 1. One-time setup

### Database

```bash
createdb kloqra   # if needed
pnpm prisma:migrate
pnpm prisma:seed
```

### Environment files

**API** (`apps/api/.env`) — add:

```env
INTEGRATION_TOKEN_ENCRYPTION_KEY=dev-integration-encryption-key-32chars
ATLASSIAN_CLIENT_ID=<from Atlassian developer console>
ATLASSIAN_CLIENT_SECRET=<from Atlassian developer console>
ATLASSIAN_REDIRECT_URI=http://localhost:3001/integrations/jira/callback
```

**Atlassian OAuth app** ([developer.atlassian.com](https://developer.atlassian.com/console/myapps/)):

| Setting       | Value                                                |
| ------------- | ---------------------------------------------------- |
| Callback URL  | `http://localhost:3001/integrations/jira/callback`   |
| Scopes        | `read:jira-work`, `read:jira-user`, `offline_access` |
| Authorization | OAuth 2.0 (3LO)                                      |

**Client** (`apps/client/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_SCOPE=client
```

**Admin** (`apps/admin/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_SCOPE=admin
NEXT_PUBLIC_CLIENT_APP_URL=http://localhost:3000
```

### Automated checks

```bash
bash scripts/test-jira-integration.sh
```

---

## 2. Start the stack

```bash
pnpm dev
```

| App    | URL                   |
| ------ | --------------------- |
| Client | http://localhost:3000 |
| API    | http://localhost:3001 |
| Admin  | http://localhost:3002 |

**Seed logins:** `admin@kloqra.dev` / `member@kloqra.dev` — password `password123`

---

## 3. Admin — connect Jira + mapping

1. Open http://localhost:3002 → login as admin
2. **Workspace** → Jira integration card
3. **Connect Jira** → authorize your `*.atlassian.net` site
4. Add mapping: Jira project key (e.g. `PROJ`) → ChronoMint project + category
5. Copy the deep-link template shown on the card

---

## 4. Member — deep link (Phase 2)

1. Login client as `member@kloqra.dev`
2. Open:

   ```
   http://localhost:3000/timer?jiraIssue=PROJ-123
   ```

   Replace `PROJ-123` with a real issue key from your Jira site.

3. Task pre-fills → **Start timer** → **Stop** → confirm entry in timesheet

**Jira Automation:** Action → Open URL → `http://localhost:3000/timer?jiraIssue={{issue.key}}`

---

## 5. Member — personal access token (Forge)

1. Client → **Settings → Integrations**
2. **Create token** (e.g. `Jira Forge`) → copy `klo_pat_…` once
3. Note **workspace ID** from browser devtools → Network → login response `workspaceId`

---

## 6. Forge issue panel (Phase 3)

Forge resolvers call your API from Atlassian’s network — **`localhost` will not work** unless tunneled.

### Option A — ngrok (recommended for local Forge test)

```bash
ngrok http 3001
# Note the https URL, e.g. https://abc123.ngrok-free.app
```

Add to `apps/jira-forge/manifest.yml` under `permissions.external.fetch.backend` if needed:

```yaml
- address: https://abc123.ngrok-free.app
```

### Deploy Forge app

```bash
cd apps/jira-forge
npm install && npm --prefix static/panel install && npm run build
npm install -g @forge/cli   # once
forge login
forge register              # update app.id in manifest.yml
forge deploy
forge install                 # select your Jira Cloud site
```

### Configure panel (per user)

1. Open any Jira issue → **ChronoMint** panel
2. Settings:
   - **API base URL:** `https://abc123.ngrok-free.app` (or production API)
   - **Workspace ID:** UUID from step 5
   - **PAT:** `klo_pat_…` from step 5
3. **Start timer** / **Stop timer**

---

## 7. Troubleshooting

| Symptom                         | Fix                                                |
| ------------------------------- | -------------------------------------------------- |
| `JIRA_NOT_CONFIGURED`           | Set `ATLASSIAN_*` in API `.env`, restart API       |
| `JIRA_NOT_CONNECTED`            | Admin → Connect Jira                               |
| `JIRA_PROJECT_NOT_MAPPED`       | Admin → map Jira project key to ChronoMint project |
| `JIRA_ISSUE_NOT_FOUND`          | Issue key wrong or Jira token expired — reconnect  |
| Forge can’t reach API           | Use ngrok/public URL, not `localhost`              |
| `PERSONAL_ACCESS_TOKEN_INVALID` | Regenerate PAT; revoke old token                   |
| CORS on OAuth callback          | `FRONTEND_ORIGIN` must include admin URL           |

---

## 8. Production

Add to Railway API env:

```env
ATLASSIAN_CLIENT_ID=...
ATLASSIAN_CLIENT_SECRET=...
ATLASSIAN_REDIRECT_URI=https://api.yourdomain.com/integrations/jira/callback
INTEGRATION_TOKEN_ENCRYPTION_KEY=<unique-32+-chars>
```

Update Atlassian app callback to production URL. Set `NEXT_PUBLIC_CLIENT_APP_URL` on admin for deep-link examples.

Forge: `forge deploy --environment production` + Marketplace when ready.
