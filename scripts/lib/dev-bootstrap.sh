#!/usr/bin/env bash
# Shared local dev bootstrap (Postgres, env files, dev terminal instructions).
set -euo pipefail

dev_bootstrap_root() {
  cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
}

dev_bootstrap_resolve_pnpm() {
  PNPM="${PNPM:-pnpm}"
  if ! command -v pnpm >/dev/null 2>&1; then
    PNPM="npx pnpm@9.15.0"
  fi
  export PNPM
}

dev_bootstrap_ensure_postgres() {
  PG_ISREADY=""
  for bin in pg_isready "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_isready"; do
    if command -v "$bin" >/dev/null 2>&1 || [[ -x "$bin" ]]; then
      PG_ISREADY="$bin"
      break
    fi
  done

  if [[ -n "$PG_ISREADY" ]] && ! "$PG_ISREADY" -h localhost -p 5432 -q 2>/dev/null; then
    echo "==> Starting Postgres.app..."
    open -a Postgres 2>/dev/null || true
    for _ in {1..15}; do
      sleep 1
      "$PG_ISREADY" -h localhost -p 5432 -q 2>/dev/null && break
    done
  fi

  if [[ -n "$PG_ISREADY" ]] && ! "$PG_ISREADY" -h localhost -p 5432 -q 2>/dev/null; then
    echo "ERROR: PostgreSQL is not running on localhost:5432."
    echo "Start Postgres.app or install PostgreSQL, then retry."
    exit 1
  fi
}

dev_bootstrap_ensure_env_files() {
  if [[ ! -f apps/api/.env ]]; then
    cp apps/api/.env.example apps/api/.env
    echo "==> Created apps/api/.env — set DATABASE_URL to your Postgres user if login fails."
  fi

  for app in client admin; do
    if [[ ! -f "apps/$app/.env.local" ]]; then
      echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3001" > "apps/$app/.env.local"
    fi
  done
}

dev_bootstrap_prep() {
  dev_bootstrap_ensure_postgres
  dev_bootstrap_ensure_env_files
  echo "==> Generating Prisma client..."
  $PNPM prisma:generate
}

dev_bootstrap_print_dev_terminals() {
  echo ""
  echo "==> Start each in its own terminal (all watch mode):"
  echo ""
  echo "    1. pnpm dev:shared    contracts + ui  (tsup/tsc --watch — start first)"
  echo "    2. pnpm dev:api       API             http://localhost:3001  (nest --watch)"
  echo "    3. pnpm dev:client    Client          http://localhost:3000  (next dev)"
  echo "    4. pnpm dev:admin     Admin           http://localhost:3002  (next dev)"
  echo ""
  echo "    Wait for dev:shared 'Build success' before starting the apps."
  echo "    Login: member@kloqra.dev / admin@kloqra.dev  password: password123"
  echo ""
  echo "    All-in-one (single terminal, one-shot shared build): pnpm dev"
  echo ""
}
