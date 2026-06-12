#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/dev-bootstrap.sh
source "$ROOT/scripts/lib/dev-bootstrap.sh"

dev_bootstrap_root
dev_bootstrap_resolve_pnpm

echo "==> Kloqra local prep (no migrate/seed)"

dev_bootstrap_prep
dev_bootstrap_print_dev_terminals
