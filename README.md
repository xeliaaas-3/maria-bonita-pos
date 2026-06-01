# 🛍️ Boutique POS — Sistema de Gestión para Boutiques

Sistema completo de punto de venta, inventario y gestión para boutiques de ropa.
Diseño premium, moderno y responsivo. Funciona en PC, celular y tablet.

---

## 🚀 Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + Framer Motion |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT + Refresh Tokens |
| Tiempo real | Socket.io |
| Cache | Redis |
| Contenedores | Docker + Docker Compose |
| PDF | PDFKit |
| Reportes | XLSX |

---

## 📦 Instalación Rápida (Docker)

### 1. Clonar y configurar

```bash
git clone <repo>
cd boutique-pos
cp .env.example .env
# Editar .env con tus credenciales
```

### 2. Levantar con Docker Compose

```bash
docker-compose up -d
```

El sistema estará disponible en:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api/v1
- **Base de datos**: localhost:5432

### 3. Credenciales iniciales

| Usuario | Email | Contraseña | Rol |
|---------|-------|-----------|-----|
| Admin | admin@boutique.com | admin123 | Administrador |
| Cajero | cajero@boutique.com | cajero123 | Cajero |

> ⚠️ **Cambiar contraseñas en producción**

---

## 🛠️ Instalación Manual (Desarrollo)

### Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Editar .env

# Migrations y seed
npx prisma migrate dev
npx prisma db seed

# Iniciar
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Estructura del Proyecto

```
boutique-pos/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Modelos de BD
│   │   └── seed.js            # Datos iniciales
│   └── src/
│       ├── controllers/       # Lógica de negocio
│       ├── middleware/        # Auth, errores
│       ├── routes/            # Endpoints REST
│       ├── services/          # Socket, PDF, Email
│       └── utils/             # Logger, Redis, Helpers
├── frontend/
│   └── src/
│       ├── components/        # Componentes reutilizables
│       │   ├── auth/         # ProtectedRoute, RoleGuard
│       │   ├── layout/       # Sidebar, Topbar, DashboardLayout
│       │   ├── pos/          # PaymentModal, CustomerSearch
│       │   ├── customers/    # CustomerModal
│       │   └── ui/           # Badge, EmptyState, ConfirmModal
│       ├── pages/             # Páginas de la app
│       │   ├── auth/         # Login, ForgotPassword
│       │   ├── products/     # Lista + Formulario
│       │   ├── customers/    # Lista + Detalle
│       │   └── sales/        # Lista + Detalle
│       ├── services/          # API, Socket
│       ├── store/             # Zustand (auth, theme)
│       └── utils/             # format, helpers
└── docker/
    └── nginx.conf             # Proxy reverso
```

---

## 🔌 API REST — Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/refresh` | Renovar token |
| POST | `/api/v1/auth/logout` | Cerrar sesión |
| GET | `/api/v1/auth/me` | Perfil actual |
| PATCH | `/api/v1/auth/change-password` | Cambiar contraseña |
| POST | `/api/v1/auth/forgot-password` | Recuperar contraseña |

### Productos
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/api/v1/products` | Listar productos |
| GET | `/api/v1/products/search?q=` | Búsqueda para POS |
| GET | `/api/v1/products/:id` | Detalle producto |
| POST | `/api/v1/products` | Crear producto |
| PUT | `/api/v1/products/:id` | Actualizar |
| DELETE | `/api/v1/products/:id` | Eliminar/Desactivar |

### Ventas (POS)
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/api/v1/sales` | Listar ventas |
| POST | `/api/v1/sales` | Crear venta |
| GET | `/api/v1/sales/:id` | Detalle venta |
| GET | `/api/v1/sales/:id/ticket` | PDF ticket |
| PATCH | `/api/v1/sales/:id/cancel` | Cancelar venta |

### Inventario
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/api/v1/inventory` | Stock actual |
| GET | `/api/v1/inventory/kardex` | Historial movimientos |
| POST | `/api/v1/inventory/adjust` | Ajuste de stock |
| POST | `/api/v1/inventory/transfer` | Transferencia sucursales |

### Caja
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/api/v1/cash/session/active` | Sesión activa |
| POST | `/api/v1/cash/open` | Abrir caja |
| POST | `/api/v1/cash/close` | Cerrar caja |
| POST | `/api/v1/cash/sessions/:id/movement` | Registrar movimiento |
| GET | `/api/v1/cash/sessions` | Historial sesiones |

### Reportes
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/api/v1/reports?type=sales` | Reporte de ventas |
| GET | `/api/v1/reports?type=products` | Reporte de productos |
| GET | `/api/v1/reports?type=customers` | Reporte de clientes |
| GET | `/api/v1/reports?type=cash` | Reporte de caja |

---

## 🔐 Roles y Permisos

| Función | Admin | Cajero | Empleado |
|---------|-------|--------|---------|
| Dashboard | ✅ | ✅ | ✅ |
| Punto de Venta | ✅ | ✅ | ✅ |
| Crear Productos | ✅ | ❌ | ❌ |
| Editar Productos | ✅ | ❌ | ❌ |
| Ver Inventario | ✅ | ✅ | ✅ |
| Ajustar Stock | ✅ | ✅ | ❌ |
| Ver Clientes | ✅ | ✅ | ✅ |
| Abrir/Cerrar Caja | ✅ | ✅ | ❌ |
| Ver Reportes | ✅ | ✅ | ❌ |
| Configuración | ✅ | ❌ | ❌ |
| Gestionar Usuarios | ✅ | ❌ | ❌ |

---

## ⚡ Eventos Socket.io

| Evento | Descripción |
|--------|-------------|
| `sale:created` | Nueva venta registrada |
| `stock:low` | Producto con stock bajo |
| `join:branch` | Unirse a sala de sucursal |

---

## 🗃️ Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=tu_secret_muy_largo
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu@email.com
SMTP_PASS=app_password

# App
NODE_ENV=production
PORT=4000
APP_URL=https://tu-dominio.com
```

---

## 📱 PWA / App Móvil

El frontend está preparado para:
- ✅ Funcionar como PWA (Progressive Web App)
- ✅ Instalarse en Android e iPhone desde el navegador
- ✅ Modo offline básico
- ✅ Pantalla completa en móvil
- 🔧 Convertirse a app nativa con Capacitor o React Native (siguiente paso)

---

## 🚀 Deploy en Producción

### Con Docker (recomendado)

```bash
# 1. Configurar .env para producción
# 2. Levantar servicios
docker-compose -f docker-compose.prod.yml up -d

# 3. Verificar salud
curl http://localhost/health
```

### Variables para producción
- Cambiar `JWT_SECRET` por un string de al menos 64 caracteres
- Configurar dominio real en `APP_URL`
- Habilitar HTTPS con certificado SSL
- Configurar backup automático de PostgreSQL

---

## 📊 Módulos del Sistema

1. **🔐 Autenticación** — Login, roles, sesiones, recuperación de contraseña
2. **📊 Dashboard** — KPIs en tiempo real, gráficos, alertas
3. **🛒 POS** — Punto de venta táctil, carrito, múltiples pagos, tickets PDF
4. **📦 Productos** — CRUD, variantes, SKU, código de barras, imágenes
5. **🏪 Inventario** — Stock, kardex, ajustes, transferencias entre sucursales
6. **👥 Clientes** — Registro, historial, puntos, tiers (Regular/VIP/Premium)
7. **💰 Ventas** — Historial, detalle, cancelaciones, exportación
8. **💵 Caja** — Apertura, cierre, arqueo, movimientos, historial
9. **📈 Reportes** — Ventas, productos, clientes, caja — Excel y PDF
10. **⚙️ Configuración** — Empresa, POS, usuarios, sucursales

---

## 📞 Soporte

Sistema desarrollado con React + Node.js + PostgreSQL + Docker.
Listo para producción y escalable para múltiples sucursales.
