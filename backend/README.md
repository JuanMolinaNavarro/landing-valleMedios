# Backend NestJS - Portal de Abonados ISP

API NestJS en TypeScript para autenticación por cookie HTTP-only, consulta de facturas en SQL Server y generación de PDF en tiempo real con Puppeteer.

## Endpoints

Base path: `/api`

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /health/db`
- `GET /facturas`
- `GET /facturas/:nroCbte/:tipoFac`
- `GET /facturas/:nroCbte/:tipoFac/pdf`

## Reglas de seguridad aplicadas

- La base SQL Server solo se consulta desde el backend.
- El login valida `nroAbonado + nroDoc` contra `dbo.tbAbonado`.
- El DNI se normaliza dejando solo números.
- Cada consulta de factura filtra por `nroAbonado` autenticado.
- Las queries usan parámetros (`mssql`) para evitar inyección SQL.
- La sesión viaja en cookie `HTTP-only`.

## Fuente de datos de facturación (MVP)

- Cabecera de comprobante: `dbo.FacturaOnline`
- Conceptos/ítems: `dbo.FacturaOnlineGrilla`
- El bloque de deuda vencida (`dbo.FacturaOnlineCbteDeuda`) queda para una siguiente etapa.

## Setup

1. Copiar `.env.example` a `.env` y completar credenciales reales.
2. Instalar dependencias:
   - `npm install`
3. Ejecutar en desarrollo:
   - `npm run start:dev`
4. Compilar producción:
   - `npm run build`

## Notas

- Ajustar nombres de columnas en repositorios si difieren en tu esquema real.
- Para despliegue productivo, usar `COOKIE_SECURE=true` bajo HTTPS.
- Si Chromium no está disponible en el host, definir `PUPPETEER_EXECUTABLE_PATH`.
