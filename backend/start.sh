#!/bin/sh

echo "==============================="
echo "  Boutique POS Backend"
echo "==============================="

# Esperar PostgreSQL
echo "Esperando PostgreSQL..."
RETRIES=30
until nc -z postgres 5432; do
  RETRIES=$((RETRIES-1))
  if [ $RETRIES -eq 0 ]; then
    echo "ERROR: No se pudo conectar a PostgreSQL"
    exit 1
  fi
  echo "  Reintentando... ($RETRIES)"
  sleep 2
done
echo "PostgreSQL listo. Esperando 3s..."
sleep 3

# Crear tablas desde el schema (no necesita archivos de migración)
echo "Creando/actualizando tablas..."
npx prisma db push --accept-data-loss
if [ $? -ne 0 ]; then
  echo "ERROR al crear tablas"
  exit 1
fi
echo "Tablas OK"

# Seed
echo "Ejecutando seed..."
node prisma/seed.js
if [ $? -ne 0 ]; then
  echo "ERROR en seed"
  exit 1
fi
echo "Seed OK"

# Servidor
echo "Iniciando servidor Node.js..."
exec node src/server.js
