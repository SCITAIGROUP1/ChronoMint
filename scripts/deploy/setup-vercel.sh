#!/usr/bin/env bash
# Bootstrap the Vercel staging or production product app.
#
# Prerequisites:
#   - Vercel CLI: npm i -g vercel && vercel login
#
# Usage:
#   bash scripts/deploy/setup-vercel.sh staging https://your-staging-api.railway.app
#   bash scripts/deploy/setup-vercel.sh production https://api.example.com
set -euo pipefail

ENV_NAME="${1:-}"
API_URL="${2:-}"

if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]]; then
  echo "usage: bash scripts/deploy/setup-vercel.sh <staging|production> <API_BASE_URL>" >&2
  exit 1
fi

if [[ -z "$API_URL" ]]; then
  echo "error: API_BASE_URL is required as second argument" >&2
  exit 1
fi

API_URL="${API_URL%/}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if ! command -v vercel >/dev/null 2>&1; then
  if [[ -f "$ROOT/node_modules/.bin/vercel" ]]; then
    vercel() { "$ROOT/node_modules/.bin/vercel" "$@"; }
  else
    echo "error: vercel CLI not found. Run: pnpm install (includes vercel)" >&2
    exit 1
  fi
fi

VERCEL_SCOPE="${VERCEL_SCOPE:-production}"
if [[ "$ENV_NAME" == "staging" ]]; then
  VERCEL_APP_PROJECT="${VERCEL_APP_PROJECT:-kloqra-app-staging}"
else
  VERCEL_APP_PROJECT="${VERCEL_APP_PROJECT:-kloqra-app}"
fi

setup_app() {
  local app_dir="$1"
  local project_name="$2"
  local app_url="$3"

  echo ""
  echo "=== Setting up ${project_name} (${app_dir}) ==="
  cd "${ROOT}/${app_dir}"

  vercel link --yes --project "$project_name" 2>/dev/null || vercel link

  echo "$API_URL" | vercel env add NEXT_PUBLIC_API_BASE_URL "$VERCEL_SCOPE" --force
  echo "app" | vercel env add NEXT_PUBLIC_AUTH_SCOPE "$VERCEL_SCOPE" --force
  echo "$app_url" | vercel env add APP_URL "$VERCEL_SCOPE" --force

  echo "Deploying ${project_name}..."
  vercel deploy --prod
}

echo "=== Kloqra Vercel setup: ${ENV_NAME} ==="
echo "API URL: ${API_URL}"
echo ""
echo "Ensure each Vercel project has:"
echo "  - Product app Root Directory: apps/app"
echo "  - Include source files outside Root Directory: ON"
echo ""

read -r -p "Continue with Vercel CLI setup? [y/N] " CONFIRM
case "$CONFIRM" in
  [yY]|[yY][eE][sS]) ;;
  *) echo "Manual setup: see docs/runbooks/vercel.md"; exit 0 ;;
esac

APP_URL=""
if [[ "$ENV_NAME" == "staging" ]]; then
  APP_URL="https://${VERCEL_APP_PROJECT}.vercel.app"
else
  read -r -p "Product app URL (e.g. https://app.example.com): " APP_URL
  APP_URL="${APP_URL:-https://${VERCEL_APP_PROJECT}.vercel.app}"
fi

setup_app "apps/app" "$VERCEL_APP_PROJECT" "$APP_URL"

echo ""
echo "=== Wire CORS on Railway API ==="
echo "FRONTEND_ORIGIN=$(bash "${ROOT}/scripts/deploy/wire-cors.sh" "$APP_URL")"
echo ""
echo "Update FRONTEND_ORIGIN on the Railway API service, then run:"
echo "  bash scripts/deploy/smoke.sh ${API_URL}"
