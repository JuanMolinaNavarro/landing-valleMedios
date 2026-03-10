import { Controller, Get, HttpCode, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { FacturaParamsDto } from './dto/factura-params.dto';
import { FacturaDetalleRecord, FacturaResumenRecord } from './facturas.repository';
import { FacturasService } from './facturas.service';

@Controller('facturas')
@UseGuards(AuthGuard)
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Get()
  @HttpCode(200)
  async getFacturas(@CurrentUser() user: AuthenticatedUser): Promise<{ data: FacturaResumenRecord[] }> {
    const data = await this.facturasService.getFacturas(user);
    return { data };
  }

  @Get(':nroCbte/:tipoFac')
  @HttpCode(200)
  async getFactura(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FacturaParamsDto,
  ): Promise<{ data: FacturaDetalleRecord }> {
    const data = await this.facturasService.getFacturaByComprobante(
      user,
      params.nroCbte.trim(),
      params.tipoFac.trim(),
    );
    return { data };
  }

  @Get(':nroCbte/:tipoFac/pdf')
  async getFacturaPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: FacturaParamsDto,
    @Res() response: Response,
  ): Promise<void> {
    const pdf = await this.facturasService.getFacturaPdf(
      user,
      params.nroCbte.trim(),
      params.tipoFac.trim(),
    );

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename=\"${pdf.fileName}\"`);
    response.send(pdf.content);
  }
}
