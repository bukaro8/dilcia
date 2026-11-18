#!/bin/sh
set -eu

# Extract only libpq options understood by pg_isready from Prisma's URL.
db_host=$(node -p 'new URL(process.env.DATABASE_URL).hostname.replace(/^\[|\]$/g, "")')
db_port=$(node -p 'new URL(process.env.DATABASE_URL).port || "5432"')
attempts=0
until pg_isready -q -h "$db_host" -p "$db_port" -t 2; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    echo "PostgreSQL no está disponible." >&2
    exit 1
  fi
  sleep 2
done

./node_modules/.bin/prisma migrate deploy
exec node server.js
