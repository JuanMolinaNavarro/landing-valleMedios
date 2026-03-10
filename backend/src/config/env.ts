import 'dotenv/config';

type NodeEnv = 'development' | 'test' | 'production';

export interface EnvConfig {
  nodeEnv: NodeEnv;
  port: number;
  corsOrigin: string;
  sqlServer: string;
  sqlPort: number;
  sqlDatabase: string;
  sqlUser: string;
  sqlPassword: string;
  sqlEncrypt: boolean;
  sqlTrustServerCertificate: boolean;
  sqlConnectionTimeoutMs: number;
  sqlRequestTimeoutMs: number;
  sqlPoolMax: number;
  sqlPoolMin: number;
  sqlPoolIdleTimeoutMs: number;
  sessionCookieName: string;
  sessionSecret: string;
  sessionTtlMinutes: number;
  cookieSecure: boolean;
  cookieDomain?: string;
  puppeteerExecutablePath?: string;
  puppeteerNoSandbox: boolean;
  appName: string;
}

let cachedEnv: EnvConfig | null = null;

function asRequiredString(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function asString(name: string, defaultValue: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    return defaultValue;
  }

  return value.trim();
}

function asNumber(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value in environment variable: ${name}`);
  }

  return parsed;
}

function asBoolean(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export function loadEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv;
  }

  const rawNodeEnv = asString('NODE_ENV', 'development');
  const nodeEnv: NodeEnv =
    rawNodeEnv === 'production' || rawNodeEnv === 'test' ? rawNodeEnv : 'development';
  const isProd = nodeEnv === 'production';

  cachedEnv = {
    nodeEnv,
    port: asNumber('PORT', 3001),
    corsOrigin: asString('CORS_ORIGIN', 'http://localhost:4321'),
    sqlServer: asRequiredString('SQL_SERVER'),
    sqlPort: asNumber('SQL_PORT', 1433),
    sqlDatabase: asRequiredString('SQL_DATABASE'),
    sqlUser: asRequiredString('SQL_USER'),
    sqlPassword: asRequiredString('SQL_PASSWORD'),
    sqlEncrypt: asBoolean('SQL_ENCRYPT', false),
    sqlTrustServerCertificate: asBoolean('SQL_TRUST_SERVER_CERTIFICATE', true),
    sqlConnectionTimeoutMs: asNumber('SQL_CONNECTION_TIMEOUT_MS', 15000),
    sqlRequestTimeoutMs: asNumber('SQL_REQUEST_TIMEOUT_MS', 15000),
    sqlPoolMax: asNumber('SQL_POOL_MAX', 10),
    sqlPoolMin: asNumber('SQL_POOL_MIN', 1),
    sqlPoolIdleTimeoutMs: asNumber('SQL_POOL_IDLE_TIMEOUT_MS', 30000),
    sessionCookieName: asString('SESSION_COOKIE_NAME', 'isp_portal_session'),
    sessionSecret: asRequiredString('SESSION_SECRET'),
    sessionTtlMinutes: asNumber('SESSION_TTL_MINUTES', 720),
    cookieSecure: asBoolean('COOKIE_SECURE', isProd),
    cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined,
    puppeteerNoSandbox: asBoolean('PUPPETEER_NO_SANDBOX', true),
    appName: asString('APP_NAME', 'Portal Abonados ISP'),
  };

  return cachedEnv;
}
