## smartSticker – API Núcleo B2B (Tracksolid Pro)

API REST en **Fastify** que expone endpoints B2B (solo lectura) y se integra con **Tracksolid Pro (JimiCloud)** mediante:

- Selección de **zona/nodo** (`ts`, `hk`, `eu`, `us`)
- **Token** (`jimi.oauth.token.get` / `jimi.oauth.token.refresh`)
- **Firma** MD5 por parámetros (según doc oficial)
- **Normalización** de respuestas y formato estándar `{ data, meta }` / `{ error }`
- **MySQL** para configuración + caché:
  - Catálogo de dispositivos: `devices_cache`
  - Historial de ubicaciones por IMEI+rango: `device_track_cache_points` + `device_track_cache_windows`

### Requisitos

- Node.js 20+
- Docker Desktop (para MySQL)

### Arranque local

1) Copia variables de entorno

- Crea `.env` basado en `.env.example`

2) Levanta MySQL

```bash
docker compose up -d
```

3) Migraciones + seed de zonas

```bash
npm run migrate:latest
npm run seed:run
```

4) Crea customers (clientes) en DB

Inserta registros en la tabla `customers` con: `nit`, `name`, `is_active`.

Ejemplo (SQL):

```sql
INSERT INTO customers (nit, name, is_active) VALUES ('900123456', 'Cliente Demo', 1);
```

5) Genera API keys (se guardan como **hash SHA-256**)

```bash
npm run apikeys:generate
```

Opcional, para un solo cliente:

```bash
npm run apikeys:generate -- --nit=900123456
```

- El comando imprime: `nit<TAB>name<TAB>apiKey`
- La **API key en claro solo se muestra al generarla** (en DB se guarda `apikeys.api_key_hash`)

6) (Opcional) Cargar credenciales Tracksolid (cifradas en DB)

El proyecto incluye el script `npm run creds:set`, que toma credenciales desde variables de entorno y las guarda cifradas en `zone_credentials`.

```bash
npm run creds:set
```

Variables requeridas (además de las de DB y `ENCRYPTION_KEY_B64`):

- `ZONE_CODE` (ej: `us`)
- `JIMI_USER_ID`
- `JIMI_USER_PWD_MD5` (md5 en minúsculas)
- `JIMI_APP_KEY`
- `JIMI_APP_SECRET`

7) Levanta la API

```bash
npm run dev
```

### Autenticación

- Envía `Authorization: Bearer <apiKey>` en los endpoints protegidos.
- La API key **no expira automáticamente**; queda activa hasta revocarla en DB.
- La validación se hace con `sha256(apiKey)` contra `apikeys.api_key_hash` (no guardamos la key en texto plano).

### Caché

- **Catálogo de dispositivos**: controlado por `DEVICES_CACHE_TTL_SECONDS`.
  - Si responde desde caché, devuelve `meta.cached: true`.
  - Refresh manual: `POST /v1/cache/devices/sync` body `{ zone }`.
- **Historial de ubicaciones por IMEI+rango**: controlado por `LOCATIONS_CACHE_TTL_SECONDS`.
  - Aplica cuando el rango coincide exactamente (`imei + beginTime + endTime`) y el TTL está vigente.
  - Si responde desde caché, devuelve `meta.cached: true`.

### Endpoints principales (PRD)

- `GET /health` (sin auth)
- `GET /v1/zones`
- `GET /v1/devices?zone=eu`
- `GET /v1/devices/:imei?zone=eu`
- `GET /v1/devices/locations?zone=eu`
- `GET /v1/devices/:imei/locations?zone=eu&beginTime=2026-03-18 00:00:00&endTime=2026-03-18 23:59:59`
- `GET /v1/devices/:imei/location?zone=eu`
- `POST /v1/cache/devices/sync` body `{ zone }`
- `POST /v1/cache/token/refresh` body `{ zone }`

### GPS tracker (HTML)

En `gps-tracker.html` ajusta `API_TOKEN` con la API key en claro generada por `npm run apikeys:generate`.

### Docs Swagger

- UI: `GET /docs`

