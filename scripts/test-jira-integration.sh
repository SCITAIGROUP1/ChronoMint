#!/usr/bin/env bash
# Local Jira integration verification (Phases 1–3).
# Usage: bash scripts/test-jira-integration.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$ROOT/scripts/bin:$PATH"

cd "$ROOT"

echo "==> Prisma migrate + generate"
pnpm --filter @kloqra/api exec prisma migrate deploy
pnpm --filter @kloqra/api exec prisma generate

echo "==> Contracts build"
pnpm --filter @kloqra/contracts build

echo "==> API Jira e2e"
pnpm --filter @kloqra/api exec vitest run --config vitest.e2e.config.ts test/jira.e2e.ts

echo "==> Forge unit tests"
cd "$ROOT/apps/jira-forge"
npm install --silent
npm test

echo "==> Web-shared jira helpers"
cd "$ROOT"
pnpm --filter @kloqra/web-shared exec vitest run src/integrations/jira-api.spec.ts

echo "==> Client jira deep-link spec"
pnpm --filter @kloqra/client exec vitest run src/features/timer/use-jira-issue-deep-link.spec.ts

echo "==> Forge panel build"
cd "$ROOT/apps/jira-forge"
npm --prefix static/panel install --silent
npm run build

echo ""
echo "✓ Automated Jira integration checks passed."
echo ""
if [[ -z "${ATLASSIAN_CLIENT_ID:-}" ]]; then
  if grep -q '^ATLASSIAN_CLIENT_ID=$' "$ROOT/apps/api/.env" 2>/dev/null || \
     ! grep -q '^ATLASSIAN_CLIENT_ID=' "$ROOT/apps/api/.env" 2>/dev/null; then
    echo "Manual next steps:"
    echo "  1. Create OAuth app at https://developer.atlassian.com/console/myapps/"
    echo "  2. Set ATLASSIAN_CLIENT_ID, ATLASSIAN_CLIENT_SECRET in apps/api/.env"
    echo "  3. Callback URL: http://localhost:3001/integrations/jira/callback"
    echo "  4. pnpm dev → Admin Workspace → Connect Jira → map project"
    echo "  5. Client /timer?jiraIssue=YOUR-KEY or deploy Forge (see docs/runbooks/jira-integration.md)"
  fi
fi
