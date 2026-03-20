## smartSticker – API Núcleo B2B (Tracksolid Pro)

API REST en **Fastify** que expone endpoints B2B (solo lectura) y se integra con **Tracksolid Pro (JimiCloud)** mediante:

- Selección de **zona/nodo** (`ts`, `hk`, `eu`, `us`)
- **Token** (`jimi.oauth.token.get` / `jimi.oauth.token.refresh`)
- **Firma** MD5 por parámetros (según doc oficial)
- **Normalización** de respuestas y formato estándar `{ data, meta }` / `{ error }`
- **MySQL** local para configuración + caché de catálogo (`devices_cache`)

### Requisitos

- Node.js 20+
- Docker Desktop (para MySQL)

### Arranque local

1) Copia variables de entorno:

- Crea `.env` basado en `.env.example`

2) Levanta MySQL:

```bash
docker compose up -d
```

3) Migraciones + seed de zonas:

```bash
npm run migrate:latest
npm run seed:run
```

4) (Opcional) Cargar credenciales Tracksolid (cifradas en DB)

El proyecto incluye el script `npm run creds:set`, que toma credenciales desde variables de entorno y las guarda cifradas en `zone_credentials`.

```bash
npm run creds:set
```

Variables requeridas (además de las de DB y `ENCRYPTION_KEY_B64`):

- `ZONE_CODE` (ej: `ts`)
- `JIMI_USER_ID`
- `JIMI_USER_PWD_MD5` (md5 en minúsculas)
- `JIMI_APP_KEY`
- `JIMI_APP_SECRET`

5) Levanta la API:

```bash
npm run dev
```

### Endpoints principales (PRD)

- `GET /health` (sin JWT)
- `POST /auth/login` (sin JWT) → `{ data: { token } }`
- `GET /v1/zones`
- `GET /v1/devices?zone=eu`
- `GET /v1/devices/:imei?zone=eu`
- `GET /v1/devices/locations?zone=eu`
- `GET /v1/devices/:imei/locations?zone=eu&beginTime=2026-03-18 00:00:00&endTime=2026-03-18 23:59:59`
- `GET /v1/devices/:imei/location?zone=eu`
- `POST /v1/cache/devices/sync` body `{ zone }`

### Docs Swagger

- UI: `GET /docs`

