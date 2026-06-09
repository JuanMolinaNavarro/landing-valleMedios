# Frontend Integration Guide (Backend NestJS)

This document is for Codex (or any frontend dev agent) to build the subscriber portal UI against the current backend.

## 1. Backend basics

- Backend stack: NestJS + TypeScript
- Base URL (dev): `http://localhost:3001`
- Global API prefix: `/api`
- Full API base: `http://localhost:3001/api`
- Auth model: server session via HTTP-only cookie (no JWT in frontend)

## 2. Security and integration rules

- Never expose database access in frontend.
- Always call API with cookies:
  - `fetch(..., { credentials: 'include' })`
- Do not store auth tokens in `localStorage`/`sessionStorage`.
- Session cookie is HTTP-only, so frontend cannot read it. Browser handles it automatically.
- On `401`, redirect user to login.

## 3. CORS and origin

- Backend is configured for credentials and a single allowed origin.
- Default allowed frontend origin: `http://localhost:4321`.
- If frontend runs on another origin, backend `CORS_ORIGIN` must be updated.

## 4. Error response contract (global)

All errors follow:

```json
{
  "statusCode": 401,
  "message": "Credenciales invalidas",
  "path": "/api/auth/login",
  "timestamp": "2026-03-11T12:00:00.000Z"
}
```

Use `message` for user-friendly feedback.

## 5. Endpoints

## Public

### `GET /health/db`
- Purpose: backend + DB connectivity check.
- Response `200`:

```json
{
  "status": "ok",
  "database": "reachable",
  "timestamp": "2026-03-11T12:23:20.747Z"
}
```

## Auth

### `POST /auth/login`
- Body:

```json
{
  "nroAbonado": "4238"
}
```

Notes:
- `nroAbonado` is validated as positive integer.
- Login no longer requires `nroDoc`; the backend looks up the subscriber by `nroAbonado`.

Response `200`:

```json
{
  "user": {
    "nroAbonado": "4238",
    "nroDoc": "23139395514",
    "nombre": "LOPEZ GRACIELA DEL VALLE"
  }
}
```

### `POST /auth/logout` (requires session cookie)
- Response `200`:

```json
{
  "message": "Sesion cerrada"
}
```

### `GET /auth/me` (requires session cookie)
- Response `200`:

```json
{
  "user": {
    "nroAbonado": "4238",
    "nroDoc": "23139395514",
    "nombre": "LOPEZ GRACIELA DEL VALLE"
  }
}
```

## Facturas (requires session cookie)

### `GET /facturas`
- Returns invoice list for authenticated subscriber only.
- Response:

```json
{
  "data": [
    {
      "nroAbonado": 4238,
      "nroCbte": 1100086113,
      "tipoFac": "B",
      "fecEmision": "01/03/2026",
      "periodo": "2026/03",
      "apeNom": "LOPEZ, GRACIELA DEL VALLE",
      "impNetoVto1": 30185,
      "fecVto1": "10/03/2026"
    }
  ]
}
```

### `GET /facturas/:nroCbte/:tipoFac`
- Params:
  - `nroCbte`: numeric string
  - `tipoFac`: single letter (`A-Z`)
- Response:

```json
{
  "data": {
    "header": {
      "nroAbonado": 4238,
      "nroCbte": 1100086113,
      "tipoFac": "B",
      "fecEmision": "01/03/2026",
      "apeNom": "LOPEZ, GRACIELA DEL VALLE",
      "domicilio": "TAFI DEL VALLE, HAYRA CAPAC   100",
      "domRef": "LAS TACANAS",
      "domLocal": "TAFI DEL VALLE",
      "cobrador": "PROVIDERS VENTAS/COBRANZAS",
      "desSitIva": "Consumidor Final",
      "cuit": "23139395514",
      "periodo": "2026/03",
      "fecVto1": "10/03/2026",
      "fecVto2": "17/03/2026",
      "fecVto3": "24/03/2026",
      "impNetoVto1": 30185,
      "impNetoVto2": 30335,
      "impNetoVto3": 30485,
      "iva": 5238.72,
      "nroCae": "86096232820312",
      "fevtoCae": "11/03/2026",
      "barCode": "(^...)", 
      "barDigito": "4690...",
      "txtObs": null,
      "linkPagos": "00004238",
      "dirEmail": null
    },
    "items": [
      {
        "item": "1",
        "descripcion": "Internet 10 Mb Wifi",
        "impItemNeto": 25185,
        "iva": 4370.95,
        "providers": null
      }
    ]
  }
}
```

Note: `item` may come as string from SQL driver. Frontend can cast with `Number(item)`.

### `GET /facturas/:nroCbte/:tipoFac/pdf`
- Returns `application/pdf`.
- Suggested frontend behavior:
  - open in new tab, or
  - download blob with filename from `Content-Disposition`.

## 6. Source of invoice data (current MVP)

- Header fields: `dbo.FacturaOnline`
- Concepts/items: `dbo.FacturaOnlineGrilla`
- Not included yet in MVP:
  - `dbo.FacturaOnlineCbteDeuda` (vencidos/no abonados section)

## 7. Recommended frontend pages

1. `/login`
  - Form: `nroAbonado`
  - Submit to `POST /auth/login`
  - On success: redirect to `/facturas`
  - On error: show API `message`

2. `/facturas`
  - On load: `GET /auth/me`, if 401 -> redirect `/login`
  - Then `GET /facturas`
  - Show table: nroCbte, tipoFac, fecha emision, periodo, vencimiento, importe
  - Actions:
    - "Ver detalle" -> `/facturas/:nroCbte/:tipoFac`
    - "Ver PDF" -> open `/facturas/:nroCbte/:tipoFac/pdf`

3. `/facturas/:nroCbte/:tipoFac`
  - Fetch detail endpoint
  - Render:
    - Header data
    - Vencimientos
    - Concepts/items
    - Totals
  - Button "Abrir PDF"

4. Header user menu
  - `GET /auth/me` for user name
  - `POST /auth/logout`

## 8. Suggested frontend TS types

```ts
export interface AuthUser {
  nroAbonado: string;
  nroDoc: string;
  nombre: string;
}

export interface FacturaResumen {
  nroAbonado: number;
  nroCbte: number;
  tipoFac: string;
  fecEmision: string | null;
  periodo: string | null;
  apeNom: string | null;
  impNetoVto1: number;
  fecVto1: string | null;
}

export interface FacturaHeader {
  nroAbonado: number;
  nroCbte: number;
  tipoFac: string;
  fecEmision: string | null;
  apeNom: string | null;
  domicilio: string | null;
  domRef: string | null;
  domLocal: string | null;
  cobrador: string | null;
  desSitIva: string | null;
  cuit: string | null;
  periodo: string | null;
  fecVto1: string | null;
  fecVto2: string | null;
  fecVto3: string | null;
  impNetoVto1: number;
  impNetoVto2: number;
  impNetoVto3: number;
  iva: number;
  nroCae: string | null;
  fevtoCae: string | null;
  barCode: string | null;
  barDigito: string | null;
  txtObs: string | null;
  linkPagos: string | null;
  dirEmail: string | null;
}

export interface FacturaItem {
  item: string | number;
  descripcion: string | null;
  impItemNeto: number;
  iva: number;
  providers: string | null;
}

export interface FacturaDetalle {
  header: FacturaHeader;
  items: FacturaItem[];
}
```

## 9. Fetch helper pattern

```ts
const API_BASE = "http://localhost:3001/api";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
```

## 10. Current known backend behavior

- `/facturas` can return many rows (no pagination yet).
- Date fields are already formatted as `dd/MM/yyyy` strings from SQL views.
- Amount fields are numeric, format in UI with locale `es-AR`.
- PDF endpoint depends on Puppeteer/Chrome availability on server.
