# Valle Medios - Portal de Abonados

Proyecto dividido en 2 apps:

- `frontend/`: Astro SSR (portal web).
- `backend/`: NestJS (auth, facturas, PDF con Puppeteer, SQL Server).

Este repo ya queda preparado para despliegue en **Ubuntu Server con Docker Compose** usando:

- `frontend` (Node en puerto interno `4321`)
- `backend` (Node en puerto interno `3001`)
- `nginx` (entrypoint publico, proxy de `/` y `/api`)

## Estructura Docker agregada

- `frontend/Dockerfile`
- `backend/Dockerfile`
- `frontend/.dockerignore`
- `backend/.dockerignore`
- `docker-compose.yml`
- `deploy/nginx/default.conf`
- `.env.docker.example`
- `backend/.env.docker.example`

## Despliegue en Ubuntu

1. Clonar repo en el servidor.
2. Crear archivos de entorno:

```bash
cp .env.docker.example .env.docker
cp backend/.env.docker.example backend/.env.docker
```

3. Editar `backend/.env.docker` con valores reales:
   - `SQL_SERVER`, `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD`
   - `SESSION_SECRET` (obligatorio, largo y aleatorio)
   - `CORS_ORIGIN` con tu dominio real (por ejemplo `https://portal.tudominio.com`)
   - `COOKIE_SECURE=true` en produccion HTTPS
4. (Opcional) Editar `.env.docker`:
   - `APP_PORT` (por defecto `80`)
   - `PUBLIC_API_BASE` (por defecto `/api`)
   - `PUPPETEER_NO_SANDBOX`
5. Levantar stack:

```bash
docker compose --env-file .env.docker up -d --build
```

6. Ver logs:

```bash
docker compose --env-file .env.docker logs -f
```

## Acceso y red

- URL publica: `http://<IP-o-dominio>:APP_PORT`
- `nginx` recibe trafico y enruta:
  - `/` -> `frontend:4321`
  - `/api/*` -> `backend:3001`
- Los puertos internos de `frontend` y `backend` no se exponen al host.

## Nota importante sobre SQL Server

Si SQL Server esta en otra maquina, usar su IP/FQDN en `SQL_SERVER`.

Si SQL Server esta en el mismo host Ubuntu donde corre Docker, podes usar:

- `SQL_SERVER=host.docker.internal`

El `docker-compose.yml` ya incluye:

- `extra_hosts: "host.docker.internal:host-gateway"`

## Operacion diaria

Actualizar imagenes tras cambios de codigo:

```bash
docker compose --env-file .env.docker up -d --build
```

Parar servicios:

```bash
docker compose --env-file .env.docker down
```

## Desarrollo local sin Docker (opcional)

Backend:

```bash
cd backend
npm install
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
