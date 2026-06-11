# ChronoMint Jira Forge app

Issue panel for starting and stopping ChronoMint timers from Jira Cloud.

## Prerequisites

1. Phase 1 + 2 deployed: Jira OAuth, project mappings, resolve API
2. Workspace admin connected Jira and mapped projects (Admin → Workspace)
3. Member created a **personal access token** (Client → Settings → Integrations)

## Local development

```bash
# Install Forge CLI globally
npm install -g @forge/cli

# Install app dependencies
cd apps/jira-forge
npm install
npm --prefix static/panel install
npm run build

# Log in and register (first time)
forge login
forge register

# Update manifest.yml `app.id` with the ID from `forge register`

# Deploy to your development environment
forge deploy
forge install
```

Select your Jira Cloud site when prompted.

### Tunnel (live UI reload)

```bash
forge tunnel
```

In another terminal, run the panel dev server:

```bash
cd static/panel
npx vite --port 5173
```

Uncomment tunnel config in `manifest.yml` resources if using tunnel.

## Panel setup (per user)

1. Open any Jira issue
2. Open the **ChronoMint** issue panel
3. Enter:
   - **API base URL** — e.g. `http://localhost:3001` or production API host
   - **Workspace ID** — from ChronoMint (workspace settings or browser devtools)
   - **Personal access token** — from Settings → Integrations

## Production

- Add your production API host to `permissions.external.fetch.backend` in `manifest.yml`
- Use `forge deploy --environment production`
- Distribute via Atlassian Marketplace when ready
