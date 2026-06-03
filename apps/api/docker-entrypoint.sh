#!/bin/sh
set -e
cd /app

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is not set." >&2
  echo "On Railway, add DATABASE_URL=\${{Postgres.DATABASE_URL}} on the API service (match your Postgres plugin name)." >&2
  exit 1
fi

if [ -x ./node_modules/.bin/prisma ]; then
  echo "Running prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
fi

exec node dist/main.js
