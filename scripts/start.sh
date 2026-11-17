#!/bin/sh
set -eu
until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do echo "Esperando PostgreSQL..."; sleep 2; done
npx prisma migrate deploy
exec node server.js
