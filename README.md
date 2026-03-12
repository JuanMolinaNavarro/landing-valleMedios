# Portal de Abonados — Valle Medios (Frontend)

Frontend del portal web para abonados de Valle Medios. Construido con **Astro 4** en modo server-side (SSR) con adaptador Node.js.

---

## Estructura del proyecto

```
frontend/
└── src/
    ├── lib/
    │   └── api.ts              # Capa API centralizada + tipos TypeScript
    ├── layouts/
    │   ├── Layout.astro        # Layout de la landing pública
    │   └── PortalLayout.astro  # Layout del portal autenticado (header + menú usuario)
    ├── pages/
    │   ├── index.astro         # Landing page pública
    │   ├── login.astro         # /login — Formulario de autenticación
    │   └── facturas/
    │       ├── index.astro         # /facturas — Listado de facturas
    │       └── [nroCbte]/
    │           └── [tipoFac].astro # /facturas/:nroCbte/:tipoFac — Detalle
    └── components/             # Componentes de la landing pública
```

---

## Cómo levantar el frontend

### Desarrollo

```bash
cd frontend
npm run dev
```

El servidor de desarrollo corre en **http://localhost:4321**.

### Producción

```bash
cd frontend
npm run build
node dist/server/entry.mjs
```

---

## Cómo cambiar la URL de la API

La URL base de la API está definida en `src/lib/api.ts`:

```ts
export const API_BASE =
  import.meta.env.PUBLIC_API_BASE ?? "http://localhost:3001/api";
```

Para cambiarla sin tocar el código, creá un archivo `.env` en la carpeta `frontend/`:

```env
PUBLIC_API_BASE=http://mi-servidor.com/api
```

La variable `PUBLIC_API_BASE` tiene prioridad sobre el valor por defecto.

---

## Flujo de autenticación

- El backend usa **cookies HTTP-only** (no JWT, no localStorage).
- Todas las llamadas al API usan `credentials: "include"` automáticamente.
- Las páginas privadas verifican la sesión con `GET /auth/me` al cargar.
- Si el backend responde `401`, el usuario es redirigido automáticamente a `/login`.

---

## Páginas del portal

| Ruta                          | Descripción                                        |
| ----------------------------- | -------------------------------------------------- |
| `/login`                      | Formulario de inicio de sesión                     |
| `/facturas`                   | Listado de facturas del abonado                    |
| `/facturas/:nroCbte/:tipoFac` | Detalle de una factura con concepts y vencimientos |

---

## Notas técnicas

- El modo `output: "server"` (SSR) permite rutas dinámicas sin `getStaticPaths`.
- El adaptador `@astrojs/node@8` es compatible con Astro 4.x.
- Los errores del backend se muestran directamente desde el campo `message` de la respuesta.
- Los importes se formatean con el locale `es-AR` (pesos argentinos).
- Las fechas vienen ya formateadas como `dd/MM/yyyy` desde el backend (no se parsean).

---

## Requisitos

- Node.js 18+
- Backend NestJS corriendo en `http://localhost:3001` (o la URL configurada en `.env`)
- CORS del backend configurado para `http://localhost:4321` (ya configurado por defecto)
