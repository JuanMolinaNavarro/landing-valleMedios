import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FacturasController } from './facturas.controller';
import { FacturasRepository } from './facturas.repository';
import { FacturasService } from './facturas.service';

@Module({
  imports: [AuthModule],
  controllers: [FacturasController],
  providers: [FacturasRepository, FacturasService],
})
export class FacturasModule {}
