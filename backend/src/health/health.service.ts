import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { loadEnv } from '../config/env';
import { DatabaseService } from '../database/database.service';

interface DbHealthStatus {
  status: 'ok';
  database: 'reachable';
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly env = loadEnv();

  constructor(private readonly databaseService: DatabaseService) {}

  async checkDatabase(): Promise<DbHealthStatus> {
    try {
      const pool = await this.databaseService.getPool();
      await pool.request().query('SELECT 1 AS ok');

      return {
        status: 'ok',
        database: 'reachable',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const detail = this.getErrorDetail(error);
      this.logger.error(`DB health check failed: ${detail}`);

      if (this.env.nodeEnv === 'production') {
        throw new ServiceUnavailableException('Database unavailable');
      }

      throw new ServiceUnavailableException(`Database unavailable: ${detail}`);
    }
  }

  private getErrorDetail(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null) {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === 'string' && maybeMessage.trim() !== '') {
        return maybeMessage;
      }
    }

    return String(error);
  }
}
