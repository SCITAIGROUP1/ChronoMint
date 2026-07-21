#!/usr/bin/env bash
# Print FRONTEND_ORIGIN value for Railway API after the product app is deployed.
#
# Usage:
#   bash scripts/deploy/wire-cors.sh https://app.vercel.app [EXTRA_URL...]
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: bash scripts/deploy/wire-cors.sh <APP_URL> [EXTRA_URL...]" >&2
  exit 1
fi

ORIGINS=()
for url in "$@"; do
  url="${url%/}"
  ORIGINS+=("$url")
done

IFS=,
echo "${ORIGINS[*]}"
