#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

echo "Verificando seed inicial..."
node dist/bootstrap-seed.js || true

echo "Iniciando API..."
exec "$@"
