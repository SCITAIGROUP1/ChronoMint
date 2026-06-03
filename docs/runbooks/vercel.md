# Deploy client & admin on Vercel

ChronoMint has **three** deployable parts:

| App                        | Platform                   | Why                                                               |
| -------------------------- | -------------------------- | ----------------------------------------------------------------- |
| **Client** (`apps/client`) | Vercel                     | Next.js 15                                                        |
| **Admin** (`apps/admin`)   | Vercel                     | Next.js 15                                                        |
| **API** (`apps/api`)       | Railway, Render, or Fly.io | NestJS + PostgreSQL + Redis (long-running, not Vercel serverless) |

Deploy the **API first** (or use a staging API URL), then point both frontends at it.

---

## 1. API (required before frontends work)

Use a host that supports Docker or Node 20 + Postgres + Redis.

### Option A — Railway (recommended)

1. [railway.app](https://railway.app) → New project → Deploy from GitHub → select `ChronoMint`.
2. Add **PostgreSQL** and **Redis** plugins to the project.
3. Add a **service** from repo with:
   - **Root directory:** leave empty (monorepo root)
   - **Dockerfile path:** `apps/api/Dockerfile`
   - Or use Nixpacks with start command `node apps/api/dist/main.js` after build (Docker is simpler).
4. Set variables on the API service:

   | Variable             | Value                                                                                       |
   | -------------------- | ------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`       | From Railway Postgres (`${{Postgres.DATABASE_URL}}`)                                        |
   | `REDIS_URL`          | From Railway Redis                                                                          |
   | `JWT_ACCESS_SECRET`  | Random 32+ chars                                                                            |
   | `JWT_REFRESH_SECRET` | Random 32+ chars                                                                            |
   | `FRONTEND_ORIGIN`    | `https://YOUR-CLIENT.vercel.app,https://YOUR-ADMIN.vercel.app` (update after Vercel deploy) |
   | `PORT`               | `3001`                                                                                      |

5. Run migrations once (Railway shell or local against prod DB):

   ```bash
   DATABASE_URL="..." pnpm --filter @chronomint/api exec prisma migrate deploy
   ```

6. Note the public API URL, e.g. `https://chronomint-api-production.up.railway.app`.

### Option B — Render

1. **Web Service** → Docker → repo root, Dockerfile `apps/api/Dockerfile`.
2. Add managed Postgres + Redis (or Upstash Redis).
3. Same env vars as above.

Health check: `GET /health` on your API URL.

---

## 2. Vercel — Client app

1. [vercel.com](https://vercel.com) → **Add New Project** → Import `SCITAIGROUP1/ChronoMint` (or your fork).
2. **Project name:** e.g. `chronomint-client`
3. **Root Directory:** `apps/client` (Edit → Root Directory)
4. **Framework Preset:** Next.js (auto)
5. Enable **“Include source files outside of the Root Directory”** (required for `packages/ui` and `packages/contracts`).
6. Build settings (usually auto from `apps/client/vercel.json`):
   - Install: `pnpm install --frozen-lockfile`
   - Build: `pnpm --filter @chronomint/client... build`
7. **Environment variables:**

   | Name                       | Value                                                   |
   | -------------------------- | ------------------------------------------------------- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://your-api-host.example.com` (no trailing slash) |

8. Deploy → copy production URL, e.g. `https://chronomint-client.vercel.app`.

---

## 3. Vercel — Admin app

Create a **second** Vercel project (same repo, different root):

1. **Add New Project** → same GitHub repo.
2. **Project name:** e.g. `chronomint-admin`
3. **Root Directory:** `apps/admin`
4. **Include source files outside of the Root Directory:** ON
5. Build from `apps/admin/vercel.json`:
   - Build: `pnpm --filter @chronomint/admin... build`
6. **Environment variables:**

   | Name                       | Value                  |
   | -------------------------- | ---------------------- |
   | `NEXT_PUBLIC_API_BASE_URL` | Same API URL as client |

7. Deploy → e.g. `https://chronomint-admin.vercel.app`.

---

## 4. Wire CORS on the API

Update API `FRONTEND_ORIGIN` to both Vercel URLs (comma-separated, HTTPS):

```env
FRONTEND_ORIGIN=https://chronomint-client.vercel.app,https://chronomint-admin.vercel.app
```

Redeploy or restart the API service after changing this.

---

## 5. Smoke test

```bash
curl https://your-api-host/health
```

1. Open admin URL → login (`admin@chronomint.dev` if you ran seed against prod DB).
2. Open client URL → login as member → start timer.
3. Admin **Team live** should show activity.

---

## CLI (optional)

From repo root, with [Vercel CLI](https://vercel.com/docs/cli) installed and logged in:

```bash
# Client (first time: follow prompts, set root to apps/client)
cd apps/client && vercel link
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel --prod

# Admin (separate project)
cd apps/admin && vercel link
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel --prod
```

---

## Custom domains

In each Vercel project: **Settings → Domains** → e.g. `app.yourdomain.com` (client), `admin.yourdomain.com` (admin).

Add those origins to API `FRONTEND_ORIGIN` as well.

---

## Why not all three on Vercel?

The API is a **NestJS** server with **Prisma**, **PostgreSQL**, **Redis** (timer/presence), and long-lived connections. Vercel is optimized for Next.js and serverless functions, not a persistent Node API + Redis. Running it on Railway/Render matches [deploy.md](./deploy.md) and avoids timeouts and missing Redis.

---

## Troubleshooting

| Issue                              | Fix                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Build can’t find `@chronomint/ui`  | Turn on “Include source files outside Root Directory”; ensure `vercel.json` build uses `...` filter            |
| `pnpm: command not found`          | Vercel project Settings → enable pnpm (or set `packageManager` in root `package.json` — already `pnpm@9.15.0`) |
| Login works locally, fails in prod | Check `NEXT_PUBLIC_API_BASE_URL`, API `FRONTEND_ORIGIN`, and API logs                                          |
| CORS error in browser              | `FRONTEND_ORIGIN` must list exact frontend origins (scheme + host)                                             |

See also [deploy.md](./deploy.md) and [ENVIRONMENT.md](../development/ENVIRONMENT.md).
