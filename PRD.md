# PRD - API Núcleo B2B para integración con Tracksolid Pro

## 1. Resumen

Se desarrollará una API REST en Fastify que funcionará como capa intermedia entre el cliente B2B y la plataforma Tracksolid Pro de JIMI. Esta API permitirá consultar dispositivos por nodo o zona, obtener su última ubicación y exponer información relevante de cada dispositivo de forma unificada, segura y desacoplada del proveedor externo.

El objetivo principal es ofrecer una interfaz estable para el cliente, ocultando la complejidad técnica de la integración con Tracksolid Pro, incluyendo autenticación con token, firma de requests, selección de nodo regional y transformación de respuestas.

---

## 2. Objetivo del producto

Construir una API backend-to-backend de solo lectura que:

- Consulte dispositivos disponibles por zona.
- Obtenga la última ubicación conocida de los dispositivos.
- Muestre información relevante y normalizada de cada dispositivo.
- Use JWT para proteger el acceso a la API propia.
- Se conecte a una base de datos local nueva para configuración y caché.
- Siga principios REST para diseño de rutas, respuestas y manejo de errores.

---

## 3. Contexto

El cliente necesita consumir información de dispositivos desde una sola API propia, sin integrarse directamente con Tracksolid Pro. La plataforma externa opera por nodos regionales y requiere autenticación y firma técnica por cada request.

Para evitar exponer esa complejidad al cliente, se construirá una capa de abstracción en Fastify que centralice la integración y entregue respuestas limpias, consistentes y listas para consumo.

---

## 4. Alcance

### Incluye

- API REST en Fastify.
- Autenticación B2B mediante JWT.
- Integración con Tracksolid Pro por nodo/zona.
- Consulta de dispositivos por zona.
- Consulta de ubicación actual por zona.
- Consulta de ubicación por IMEI.
- Consulta de detalle de dispositivo por IMEI.
- Base de datos local nueva.
- Caché local de catálogo de dispositivos.
- Caché/configuración local de nodos.
- Normalización de respuestas del proveedor externo.
- Manejo estándar de errores HTTP.

### No incluye

- Operaciones de escritura sobre Tracksolid Pro.
- Administración de usuarios finales.
- Historial de rutas o tracking histórico.
- Geocercas, comandos remotos o alarmas.
- Frontend.
- Sincronización avanzada de ubicaciones históricas.

---

## 5. Tipo de usuario

### Usuario principal

Cliente B2B que consume la API desde otro backend o middleware interno.

### Necesidad principal

Consultar dispositivos por zona y visualizar su última ubicación e información operativa relevante sin depender directamente del contrato técnico de Tracksolid Pro.

---

## 6. Requisitos funcionales

### RF-01. Autenticación propia

La API debe requerir autenticación mediante JWT para todos los endpoints funcionales, excepto salud del servicio.

### RF-02. Gestión de zonas

La API debe permitir trabajar por nodo o zona configurada localmente.

Ejemplos esperados:
- `ts`
- `hk`
- `eu`
- `us`

### RF-03. Listado de zonas

La API debe exponer un endpoint para consultar las zonas activas configuradas.

### RF-04. Catálogo de dispositivos

La API debe permitir listar los dispositivos de una zona específica.

### RF-05. Caché de catálogo

La API debe guardar localmente el catálogo de dispositivos por zona para mejorar rendimiento y reducir llamadas repetidas al proveedor externo.

### RF-06. Ubicación actual por zona

La API debe permitir consultar la última ubicación conocida de los dispositivos de una zona.

### RF-07. Ubicación por dispositivo

La API debe permitir consultar la ubicación actual de un dispositivo específico por IMEI.

### RF-08. Detalle de dispositivo

La API debe permitir consultar información ampliada de un dispositivo específico por IMEI.

### RF-09. Normalización de respuesta

La API debe transformar la respuesta del proveedor externo en un formato uniforme y entendible para el cliente.

### RF-10. Manejo de errores

La API debe mapear errores del proveedor externo a respuestas HTTP estándar y mensajes legibles.

### RF-11. Sincronización manual de catálogo

Debe existir un endpoint interno o administrativo para disparar manualmente la sincronización del catálogo por zona.

---

## 7. Requisitos no funcionales

### RNF-01. Framework

La API debe construirse sobre Fastify.

### RNF-02. Estilo arquitectónico

La API debe seguir principios REST.

### RNF-03. Seguridad

Las credenciales del proveedor externo no deben exponerse al cliente ni almacenarse en texto plano.

### RNF-04. Rendimiento

La API debe responder con baja latencia en consultas desde caché local.

### RNF-05. Escalabilidad

La solución debe permitir agregar nuevas zonas o credenciales sin rediseñar la API.

### RNF-06. Observabilidad

La API debe generar logs estructurados para auditoría y diagnóstico.

### RNF-07. Validación

Todos los parámetros de entrada deben validarse antes de ejecutar lógica de negocio.

### RNF-08. Zona horaria

La integración con el proveedor externo debe manejar timestamps en UTC.

---

## 8. Arquitectura propuesta

### Componentes

- API REST en Fastify.
- Módulo de autenticación JWT.
- Cliente HTTP para integración con Tracksolid Pro.
- Módulo de firma y autenticación externa.
- Base de datos MySQL local.
- Repositorio de caché de dispositivos.
- Capa de servicios para negocio.
- Capa de normalización de respuestas.

### Patrón general

1. El cliente llama tu API con JWT.
2. Tu API valida permisos.
3. Tu API identifica la zona solicitada.
4. Tu API recupera el token vigente del proveedor externo.
5. Tu API realiza la consulta al nodo correspondiente.
6. Tu API transforma la respuesta.
7. Tu API retorna un JSON consistente al cliente.

---

## 9. Integración externa

La API se integrará con Tracksolid Pro usando credenciales ya disponibles por zona.  
La integración debe contemplar:

- Obtención y reutilización de token externo.
- Selección del endpoint base según nodo.
- Firma de requests.
- Control de expiración del token.
- Mapeo de errores del proveedor.
- Respeto por límites de frecuencia.

---

## 10. Información relevante a exponer

La API debe priorizar la información más útil para el cliente en lugar de replicar todo el payload externo.

### Datos sugeridos del dispositivo

- IMEI
- Nombre del dispositivo
- Tipo/modelo
- SIM
- Grupo
- Estado habilitado
- Nombre del conductor
- Teléfono del conductor
- Número de motor
- VIN o placa, si aplica
- Estado operativo, si está disponible

### Datos sugeridos de ubicación

- IMEI
- Nombre del dispositivo
- Estado online/offline, si aplica
- Latitud
- Longitud
- Velocidad
- Rumbo
- Fecha/hora GPS
- Tipo de posicionamiento
- Batería
- ACC
- Kilometraje

---

## 11. Endpoints REST propuestos

### Autenticación

#### `POST /auth/login`
Emite un JWT para consumo B2B.

---

### Salud

#### `GET /health`
Verifica estado del servicio.

---

### Zonas

#### `GET /v1/zones`
Lista las zonas configuradas y activas.

**Respuesta esperada**
```json
{
  "data": [
    { "code": "eu", "name": "Europe" },
    { "code": "us", "name": "United States" },
    { "code": "hk", "name": "Hong Kong / Singapore" },
    { "code": "ts", "name": "Tracksolid" }
  ]
}
Dispositivos
GET /v1/devices?zone=eu
Lista dispositivos del nodo indicado.

Query params

zone obligatorio

Respuesta esperada

json
{
  "data": [
    {
      "imei": "123456789012345",
      "deviceName": "Truck 12",
      "deviceType": "JM-LL301",
      "sim": "8957000000000000000",
      "group": "Fleet Medellin",
      "enabled": true,
      "driverName": "Carlos Ruiz",
      "driverPhone": "3000000000"
    }
  ],
  "meta": {
    "zone": "eu",
    "cached": true
  }
}
GET /v1/devices/:imei
Retorna detalle de un dispositivo.

Path params

imei obligatorio

Query params

zone obligatorio

Respuesta esperada

json
{
  "data": {
    "imei": "123456789012345",
    "deviceName": "Truck 12",
    "deviceType": "JM-LL301",
    "sim": "8957000000000000000",
    "group": "Fleet Medellin",
    "enabled": true,
    "driverName": "Carlos Ruiz",
    "driverPhone": "3000000000",
    "engineNumber": "ENG-8891",
    "vin": "1HGCM82633A123456",
    "plateNumber": "ABC123"
  }
}
Ubicaciones
GET /v1/devices/locations?zone=eu
Retorna la última ubicación conocida de los dispositivos de una zona.

Query params

zone obligatorio

Respuesta esperada

json
{
  "data": [
    {
      "imei": "123456789012345",
      "deviceName": "Truck 12",
      "status": "online",
      "latitude": 6.2442,
      "longitude": -75.5812,
      "speed": 42,
      "course": 180,
      "gpsTime": "2026-03-18T20:25:00Z",
      "positionType": "gps",
      "battery": 87,
      "acc": 1,
      "mileage": 154320.5
    }
  ],
  "meta": {
    "zone": "eu",
    "cached": false
  }
}
GET /v1/devices/:imei/location?zone=eu
Retorna la última ubicación conocida de un dispositivo.

Path params

imei obligatorio

Query params

zone obligatorio

Respuesta esperada

json
{
  "data": {
    "imei": "123456789012345",
    "deviceName": "Truck 12",
    "status": "online",
    "latitude": 6.2442,
    "longitude": -75.5812,
    "speed": 42,
    "course": 180,
    "gpsTime": "2026-03-18T20:25:00Z",
    "positionType": "gps",
    "battery": 87,
    "acc": 1,
    "mileage": 154320.5
  }
}
Administración interna
POST /v1/cache/devices/sync
Fuerza la sincronización del catálogo de dispositivos por zona.

Body esperado

json
{
  "zone": "eu"
}
12. Reglas de diseño REST
Los recursos deben representarse con sustantivos, no verbos.

Los filtros deben viajar por query params.

Los recursos específicos deben viajar por path params.

Los códigos HTTP deben usarse de forma semántica.

Las respuestas deben mantener una estructura uniforme.

No se deben exponer detalles internos del proveedor externo.

La zona debe ser explícita en todas las consultas que dependan del nodo.

13. Estructura de respuesta estándar
Respuesta exitosa
json
{
  "data": {},
  "meta": {}
}
Respuesta con error
json
{
  "error": {
    "code": "UPSTREAM_RATE_LIMIT",
    "message": "Rate limit exceeded for provider request"
  }
}
14. Manejo de errores HTTP
Errores esperados
400 Bad Request para parámetros inválidos.

401 Unauthorized para JWT ausente o inválido.

403 Forbidden para credenciales sin permisos.

404 Not Found para recursos inexistentes.

429 Too Many Requests para límites de frecuencia.

502 Bad Gateway para errores del proveedor externo.

503 Service Unavailable para indisponibilidad temporal.

15. Modelo de datos local
Tabla zones
id

code

name

base_url

is_active

created_at

updated_at

Tabla zone_credentials
id

zone_id

app_key

app_secret_encrypted

user_id

user_pwd_md5_encrypted

access_token_encrypted

refresh_token_encrypted

token_expires_at

created_at

updated_at

Tabla devices_cache
id

zone_id

imei

device_name

device_type

sim

device_group_id

device_group

enabled_flag

driver_name

driver_phone

engine_number

vin

plate_number

raw_payload_json

last_synced_at

Tabla sync_jobs
id

zone_id

job_type

status

started_at

finished_at

records_processed

error_message

16. Estrategia de caché
Se cachea
Catálogo de dispositivos por zona.

Configuración de zonas.

Metadatos básicos de sincronización.

Token externo, de forma segura.

No se cachea en la primera fase
Ubicaciones actuales, para evitar entregar datos desactualizados.

Historial de posiciones.

Política sugerida
Catálogo: refresco manual o programado por TTL.

Token externo: refresco automático antes de expiración.

17. Seguridad
JWT para acceso a la API propia.

Secretos en variables de entorno o servicio seguro.

Cifrado de secretos sensibles en base de datos.

No exponer credenciales externas.

Validación estricta de parámetros.

Logs sin datos sensibles.

Rate limiting interno opcional para proteger la API propia.

18. Criterios de aceptación
El cliente puede autenticarse contra la API y recibir un JWT válido.

El cliente puede consultar zonas activas disponibles.

El cliente puede listar dispositivos por zona.

El cliente puede consultar detalle de un dispositivo por IMEI.

El cliente puede consultar ubicación actual por zona.

El cliente puede consultar ubicación actual por IMEI.

La API usa la configuración del nodo correcto según la zona.

El catálogo de dispositivos puede recuperarse desde caché local.

Los errores se devuelven con formato uniforme.

La solución no expone al cliente detalles internos del proveedor.

19. Fases sugeridas
Fase 1
Base del proyecto Fastify

JWT B2B

Configuración multi-zona

Cliente de integración externa

Endpoints de zonas, dispositivos y ubicaciones

Base local y caché de catálogo

Fase 2
Sincronización programada

Mayor observabilidad

Auditoría básica

Endurecimiento de seguridad

Optimización de errores y reintentos

20. Supuestos
Las credenciales por zona ya están disponibles.

La integración será solo backend B2B.

El alcance inicial será solo lectura.

Se usará una base local nueva para esta API.

El cliente necesita principalmente listado, ubicación y detalle operativo del dispositivo.

21. Riesgos
Cambios futuros en el contrato del proveedor externo.

Diferencias de payload entre nodos.

Vencimiento o rotación de credenciales.

Límites de frecuencia del proveedor.

Inconsistencias temporales entre caché y datos remotos.

22. Decisiones iniciales
Fastify como framework principal.

MySQL local para persistencia y caché.

JWT para autenticación B2B.

Catálogo cacheado, ubicaciones no cacheadas en fase inicial.

Diseño REST con respuestas normalizadas.

Zona obligatoria en endpoints dependientes de nodo.