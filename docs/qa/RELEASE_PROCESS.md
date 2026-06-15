# Release QA process

Run at **sprint end** or before merging to `staging` / `main`.

## Preconditions

- [ ] All sprint stories `done` on Project #4 **or** explicitly deferred with PM note
- [ ] No open `priority:P0` bugs linked to release
- [ ] No cards in `qa-failed` for this sprint
- [ ] CI green on release PR (quality, unit, integration, e2e)

## Steps

### 1. Deploy staging

Confirm latest commit on staging branch is deployed. See [ENVIRONMENTS.md](ENVIRONMENTS.md) and [railway.md](../runbooks/railway.md).

```bash
bash scripts/deploy/smoke.sh https://<staging-api>.up.railway.app
```

### 2. Full smoke (manual)

Use tables in [testing-guide.md](../user-guides/qa/testing-guide.md):

- Client — 7 rows (`member@kloqra.dev`)
- Admin — 8 rows (`admin@kloqra.dev`)
- Cross-app — impersonation, workspace switch (if touched this sprint)

Add rows for new features shipped this sprint.

### 3. Automated parity (optional local)

```bash
pnpm test:prepush
```

### 4. Release sign-off

Post on the **release PR** using [release-signoff template](../../.cursor/skills/kloqra-qa-workflow/templates/release-signoff.md):

```text
QA release sign-off — v0.x / sprint YYYY-Www
Environment: staging
Client: https://kloqra-client-staging.vercel.app — PASS
Admin: https://kloqra-admin-staging.vercel.app — PASS
Sprint issues: #199 done, #200 done, …
Blockers: none
Tester: — date
```

### 5. Merge gate

Release owner merges only when sign-off posted and P0 clear.

## Per-issue vs release

| Level     | When                          | Template                                                                                   |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| Per-issue | Each story `testing` → `done` | [issue-signoff.md](../../.cursor/skills/kloqra-qa-workflow/templates/issue-signoff.md)     |
| Release   | Sprint end                    | [release-signoff.md](../../.cursor/skills/kloqra-qa-workflow/templates/release-signoff.md) |

Per-issue sign-off is **required** for every story. Release sign-off is **required** before environment promotion.
