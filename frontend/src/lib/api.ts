// ============================================================
// Capa API centralizada — Portal de Abonados
// Fuente de verdad: /CLAUDE.md
// ============================================================

export const API_BASE = import.meta.env.PUBLIC_API_BASE ?? "http://localhost:3001/api";

// ──────────────────────────────────────────────────────────────
// Error tipado
// ──────────────────────────────────────────────────────────────
export interface ApiError {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}

export class ApiRequestError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
  }
}

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// Helper principal
// ──────────────────────────────────────────────────────────────
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
    const err: Partial<ApiError> = await res.json().catch(() => ({}));
    throw new ApiRequestError(
      err?.message || `Error HTTP ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

// ──────────────────────────────────────────────────────────────
// Helpers de dominio
// ──────────────────────────────────────────────────────────────

/** Chequea sesión activa. Lanza ApiRequestError(401) si no hay sesión. */
export async function getMe(): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser }>("/auth/me");
  return data.user;
}

export async function login(nroAbonado: string, nroDoc: string): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ nroAbonado, nroDoc }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

export async function getFacturas(): Promise<FacturaResumen[]> {
  const data = await apiFetch<{ data: FacturaResumen[] }>("/facturas");
  return data.data;
}

export async function getFacturaDetalle(nroCbte: string | number, tipoFac: string): Promise<FacturaDetalle> {
  const data = await apiFetch<{ data: FacturaDetalle }>(`/facturas/${nroCbte}/${tipoFac}`);
  return data.data;
}

export function getPdfUrl(nroCbte: string | number, tipoFac: string): string {
  return `${API_BASE}/facturas/${nroCbte}/${tipoFac}/pdf`;
}

// ──────────────────────────────────────────────────────────────
// Utils de formato
// ──────────────────────────────────────────────────────────────
export function formatPeso(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}
