FROM node:20-slim

WORKDIR /app

# Instalar dependencias del sistema (Debian/slim)
RUN apt-get update && apt-get install -y \
    openssl \
    netcat-openbsd \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Node
COPY package.json ./
RUN npm install

# Copiar código
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Crear directorios
RUN mkdir -p uploads logs backups && chmod +x start.sh

EXPOSE 4000

CMD ["sh", "start.sh"]
