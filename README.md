# Buen Precio

Buen Precio es un mercado de confianza: un directorio donde consumidores descubren negocios locales en Cuba y productores publican y gestionan su catálogo. Los roles son **consumidor**, **productor** y **administrador**.

Este repositorio (v2) es un monorepo con una API REST en Fastify + PostgreSQL, un cliente web en React (Vite) y una app móvil en Expo (React Native + expo-router).

## Estructura del monorepo

```
├── server/               API REST (Fastify, Drizzle ORM, PostgreSQL) + docker-compose.yml
├── web/                  Cliente web (Vite + React + react-router)
├── mobile/               App móvil (Expo SDK 57 + expo-router) + comando-apk.sh
├── packages/shared/      Schemas Zod y constantes compartidas (compila a dist/)
└── uploads/              Media subida por los productores (ignorada por git)
```

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌──────────────┐
│  web   │ ──► │   API   │ ──► │  Postgres │
│ (5173) │     │ (3000)  │     └──────────┘
└────────┘     │         │
               │         │ ──► /uploads/ (archivos)
┌────────┐     └─────────┘
│ mobile │ ───────────────► (misma API, se configura por IP LAN)
│ (8081) │
└────────┘
```

## Requisitos previos

- Node.js 20+ (y npm)
- Docker (para PostgreSQL local) o una instancia de PostgreSQL accesible
- Expo Go en el teléfono (para la app móvil)

## Configuración inicial

### 1. Base de datos

```bash
cd server && docker compose up -d
```

Levanta PostgreSQL 16 en el puerto `5433` (usuario/contraseña/db: `buenprecio`).

### 2. Variables de entorno

Copia los ejemplos y edítalos según corresponda:

```bash
cp server/.env.example server/.env
```

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto del API (3000) |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens |
| `ADMIN_NAME/EMAIL/PASSWORD` | Credenciales del admin inicial (`npm run seed:admin`) |
| `UPLOADS_DIR` | Carpeta para media subida (por defecto `./uploads`) |

### 3. Instalar dependencias

```bash
npm install
```

> **Monorepo:** `mobile/` es miembro del workspace raíz (las dependencias de `expo`/`react-native` se resuelven desde la raíz, sin symlinks). `npm run dev:shared` corre el watcher de `@buenprecio/shared`, y `npm run typecheck`/`npm run lint`/`npm test` validan todo el repo.

## Puesta en marcha

La librería `@buenprecio/shared` se consume **compilada** (`packages/shared/dist`). Ten el watcher corriendo mientras editas algo compartido:

```bash
npm run dev:shared        # tsc --watch sobre packages/shared
```

En otra terminal:

```bash
npm run dev:api           # API en http://localhost:3000
npm run dev:web           # Web en http://localhost:5173 (proxy /api y /uploads al API)
```

Primera vez: aplica las migraciones y crea el admin:

```bash
cd api && npm run db:migrate && npm run seed:admin
```

### Móvil (Expo Go)

```bash
cd mobile && ./node_modules/.bin/expo start
```

Escanea el QR con Expo Go. Para que el teléfono alcance la API, ajusta `apiBase` en `mobile/app.json` (sección `extra`) a la IP LAN de tu máquina, p. ej.:

```json
"extra": { "apiBase": "http://192.168.133.84:3000/api/v1" }
```

> El **mapa web** (Leaflet) está restringido a Cuba. La subida de fotos de producto funciona en web; en móvil se usa la URL de la imagen (campo manual), y se resuelve contra el origen de la API (las rutas se guardan relativas como `/uploads/<archivo>`).

## Scripts útiles

| Comando | Qué hace |
| --- | --- |
| `npm run dev:shared` | Compila el paquete compartido en modo watch |
| `npm run dev:api` | API con recarga automática (`tsx watch`) |
| `npm run dev:web` | Vite dev server |
| `npm run dev:mobile` | Expo start |
| `npm run db:migrate` (en `server/`) | Aplica migraciones de Drizzle |
| `npm run db:generate` (en `server/`) | Genera una migración desde el esquema |
| `npm run seed:admin` (en `server/`) | Crea el administrador inicial |
| `npm test` | Tests del API (Vitest) |
| `npm run typecheck` | Typecheck de todo el workspace |
| `npm run lint` | ESLint de todo el workspace |

## Roles y flujos

- **Consumidor**: navega el catálogo, busca y filtra negocios, entra al detalle de un negocio y consulta productos/servicios.
- **Productor**: solicita ser productor (aprobación del admin), crea y gestiona negocios (con dirección vía GPS/mapa), publica su catálogo con ítems (producto/servicio, precio, foto) y los edita o elimina.
- **Administrador**: revisa solicitudes de productores, gestiona usuarios, categorías (de negocio y de ítem) y activa/desactiva negocios.

Credenciales de desarrollo por defecto: `admin@buenprecio.app` / `admin-cambiar-123` (según lo configurado en `.env`).

## Subida de fotos

`POST /api/v1/uploads` (autenticado, multipart) acepta `image/jpeg`, `image/png`, `image/webp` y `image/gif` con un máximo de 4 MB. En producción con `BLOB_READ_WRITE_TOKEN` (Vercel) guarda en **Vercel Blob** y devuelve una URL absoluta; sin token, guarda en disco (`UPLOADS_DIR`) y devuelve una ruta relativa (`/uploads/<uuid>.<ext>`) que el API sirve estáticamente. El esquema compartido acepta tanto rutas relativas como URLs absolutas.

## Tests

La suite del API corre contra la base `buenprecio_test` (se crea/usa automáticamente). Para ejecutarla:

```bash
npm test
```

Incluye cobertura de autenticación, negocios, catálogo, administración, cambio de contraseña y subida de media.