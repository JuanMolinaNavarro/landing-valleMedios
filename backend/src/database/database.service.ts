import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConnectionPool } from 'mssql';

import { loadEnv } from '../config/env';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: ConnectionPool | null = null;
  private poolPromise: Promise<ConnectionPool> | null = null;

  async getPool(): Promise<ConnectionPool> {
    if (this.pool) {
      return this.pool;
    }

    if (this.poolPromise) {
      return this.poolPromise;
    }

    const env = loadEnv();
    const pool = new ConnectionPool({
      user: env.sqlUser,
      password: env.sqlPassword,
      server: env.sqlServer,
      port: env.sqlPort,
      database: env.sqlDatabase,
      connectionTimeout: env.sqlConnectionTimeoutMs,
      requestTimeout: env.sqlRequestTimeoutMs,
      pool: {
        max: env.sqlPoolMax,
        min: env.sqlPoolMin,
        idleTimeoutMillis: env.sqlPoolIdleTimeoutMs,
      },
      options: {
        encrypt: env.sqlEncrypt,
        trustServerCertificate: env.sqlTrustServerCertificate,
      },
    });

    this.poolPromise = pool
      .connect()
      .then((connectedPool: ConnectionPool) => {
        this.logger.log('SQL Server pool connected');
        this.pool = connectedPool;
        return connectedPool;
      })
      .catch((error: unknown) => {
        this.poolPromise = null;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`SQL Server connection error: ${message}`);
        throw error;
      });

    return this.poolPromise;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.close();
    this.pool = null;
    this.poolPromise = null;
    this.logger.log('SQL Server pool closed');
  }
}
