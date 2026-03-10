import { Controller, Get, HttpCode } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('db')
  @HttpCode(200)
  async dbHealth(): Promise<{ status: 'ok'; database: 'reachable'; timestamp: string }> {
    return this.healthService.checkDatabase();
  }
}
