#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/dev-bootstrap.sh
source "$ROOT/scripts/lib/dev-bootstrap.sh"

dev_bootstrap_root
dev_bootstrap_resolve_pnpm

echo "==> Kloqra serve — first-time / DB setup (migrate + seed)"

dev_bootstrap_ensure_postgres
dev_bootstrap_ensure_env_files

echo "==> Installing dependencies..."
$PNPM install

echo "==> Applying migrations..."
(cd apps/api && npx prisma migrate deploy)

echo "==> Seeding database..."
$PNPM prisma:seed || true

dev_bootstrap_print_dev_terminals
