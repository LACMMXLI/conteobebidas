# Conteo de Bebidas

Aplicación web móvil (PWA) para el conteo diario de bebidas por sucursal, con historial auditable.

Prioridad: **capturar rápido → guardar correctamente → poder auditar después.**

## Arquitectura

```
conteo/
├── backend/     NestJS + Prisma + PostgreSQL (API REST)
├── frontend/    React + TypeScript + Vite (PWA, mobile-first)
└── docker-compose.yml   (para desarrollo local / referencia)
```

Servicios independientes, cada uno con su propio Dockerfile, pensados para
desplegarse por separado en Coolify (backend, frontend, Postgres como
recurso administrado o contenedor propio).

## Modelo de datos (resumen)

- **User** (ADMIN / ENCARGADO / CAPTURISTA) — `canCorrectClosedCounts` habilita
  a un ENCARGADO a corregir conteos finalizados.
- **Branch** — sucursal, con `operationalCloseHour` (hora de cierre operativo,
  configurable por sucursal, para soportar turnos que cruzan medianoche).
- **UserBranch** — acceso de usuarios a sucursales (multi-sucursal desde el inicio).
- **Product** — catálogo (nombre, categoría, presentación opcional,
  `storageArea`: REFRIGERADOR/ALMACEN, orden, activo/inactivo).
- **ProductBranch** — asignación de productos a sucursales.
- **Count** — un conteo = una sucursal + una fecha operativa. Único por
  `(branchId, operationalDate)` para impedir duplicados. Estado OPEN/FINALIZED.
- **CountItem** — apertura/entradas/cierre por producto dentro de un conteo.
- **CountAudit** — registro inmutable de cada corrección a un conteo ya
  finalizado (valor anterior, valor nuevo, quién, cuándo, motivo). Nunca se
  sobrescribe en silencio.

El modelo está preparado (a nivel de relaciones e IDs) para incorporar más
adelante ventas, consumo teórico, existencias, diferencias, mermas,
transferencias y alertas — sin haberlas implementado en esta primera etapa.

## Backend (NestJS)

```bash
cd backend
cp .env.example .env      # ajusta DATABASE_URL y los secretos JWT
npm install
npx prisma migrate deploy # aplica la migración inicial
npm run prisma:seed       # datos de ejemplo (usuarios, sucursales, productos)
npm run start:dev
```

Usuarios de prueba (contraseña `Password123!`):

| Rol | Correo |
|---|---|
| ADMIN | admin@restaurante.com |
| ENCARGADO (puede corregir cerrados) | encargado@restaurante.com |
| CAPTURISTA | capturista@restaurante.com |

La API queda en `http://localhost:3000/api`.

### Endpoints principales

- `POST /api/auth/login`, `/auth/refresh`, `/auth/logout`
- `GET /api/branches/mine` — sucursales del usuario autenticado
- `GET /api/counts/today?branchId=` — obtiene/crea el conteo del día operativo
- `PATCH /api/counts/:id/items/:productId` — autoguardado de un campo
- `POST /api/counts/:id/finalize` — valida faltantes y bloquea el conteo
- `GET /api/counts` (ADMIN/ENCARGADO) — historial con filtros
- `PATCH /api/counts/:id/items/:productId/correct` — corrección auditada de un conteo finalizado
- CRUD de `/api/branches`, `/api/products`, `/api/users` (ADMIN)

Todos los endpoints validan rol y pertenencia a sucursal **del lado del
servidor** (`RolesGuard` + verificación de acceso en `BranchesService`).

## Frontend (React + Vite, PWA)

```bash
cd frontend
cp .env.example .env      # VITE_API_URL
npm install
npm run dev
```

- Pantalla de captura de una sola columna, con esteppers grandes (+/− y toque
  para escribir), separada en Refrigeradores/Almacén, con barra de progreso
  ("X de Y productos capturados").
- Autoguardado: cada cambio se escribe primero en IndexedDB (Dexie) y luego
  se envía al servidor con reintento automático si no hay conexión.
- Instalable como PWA (manifest + service worker vía `vite-plugin-pwa`).
- Panel administrativo (`/admin`) con historial filtrable, detalle de conteo
  con historial de modificaciones, y CRUD de sucursales/productos/usuarios.

## Despliegue en Coolify

1. Crea un recurso de **PostgreSQL** (o usa el `docker-compose.yml` como base)
   y anota su `DATABASE_URL` interna.
2. Crea un recurso **Dockerfile** apuntando a `backend/`, con las variables de
   entorno de `backend/.env.example` (usa secretos reales para JWT). Al
   iniciar, el contenedor corre `prisma migrate deploy` automáticamente
   (`backend/docker-entrypoint.sh`).
3. Crea un recurso **Dockerfile** apuntando a `frontend/`, pasando
   `VITE_API_URL` como build-arg con la URL pública de la API
   (ej. `https://api.tudominio.com/api`).
4. Corre el seed una sola vez (`npm run prisma:seed` en una ejecución puntual
   contra la base de producción) para crear el primer usuario ADMIN, o
   créalo manualmente con un script equivalente.

## Fuera de alcance de esta primera etapa (a propósito)

Conciliación con ventas, consumo teórico, existencia física/esperada,
diferencias, mermas, transferencias, alertas y reportes. El modelo de datos
ya deja espacio para incorporarlos sin rediseñar lo existente.
