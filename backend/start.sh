#!/bin/sh

echo "==============================="
echo "  Boutique POS Backend"
echo "==============================="

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no definido"
  exit 1
fi

# Crear/actualizar tablas desde el schema (esperando que la DB esté lista)
echo "Sincronizando esquema con la base de datos..."
RETRIES=15
until npx prisma db push --accept-data-loss; do
  RETRIES=$((RETRIES-1))
  if [ $RETRIES -eq 0 ]; then
    echo "ERROR al crear tablas"
    exit 1
  fi
  echo "  Reintentando en 3s... ($RETRIES intentos restantes)"
  sleep 3
done
echo "Tablas OK"

# Seed (solo crea datos si no existen)
echo "Ejecutando seed..."
node prisma/seed.js || echo "Seed omitido o ya ejecutado"

# Servidor
echo "Iniciando servidor Node.js..."
exec node src/server.js
