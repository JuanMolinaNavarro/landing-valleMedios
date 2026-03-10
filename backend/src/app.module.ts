import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { FacturasModule } from './facturas/facturas.module';
import { HealthModule } from './health/health.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [DatabaseModule, AuthModule, PdfModule, FacturasModule, HealthModule],
})
export class AppModule {}
