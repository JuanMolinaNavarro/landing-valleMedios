import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { loadEnv } from '../config/env';
import { PdfService } from '../pdf/pdf.service';
import { buildFacturaHtmlTemplate } from './templates/invoice.template';
import {
  FacturaDetalleRecord,
  FacturaResumenRecord,
  FacturasRepository,
} from './facturas.repository';

@Injectable()
export class FacturasService {
  private readonly env = loadEnv();

  constructor(
    private readonly facturasRepository: FacturasRepository,
    private readonly pdfService: PdfService,
  ) {}

  async getFacturas(user: AuthenticatedUser): Promise<FacturaResumenRecord[]> {
    const nroAbonado = this.normalizeNroAbonado(user.nroAbonado);
    return this.facturasRepository.findByAbonado(nroAbonado);
  }

  async getFacturaByComprobante(
    user: AuthenticatedUser,
    nroCbte: string,
    tipoFac: string,
  ): Promise<FacturaDetalleRecord> {
    const nroAbonado = this.normalizeNroAbonado(user.nroAbonado);
    const normalizedNroCbte = this.normalizeNroCbte(nroCbte);
    const normalizedTipoFac = this.normalizeTipoFac(tipoFac);

    const header = await this.facturasRepository.findHeaderByAbonado(
      nroAbonado,
      normalizedNroCbte,
      normalizedTipoFac,
    );
    if (!header) {
      throw new NotFoundException('Factura no encontrada');
    }

    const items = await this.facturasRepository.findItemsByAbonado(
      nroAbonado,
      normalizedNroCbte,
      normalizedTipoFac,
    );

    return { header, items };
  }

  async getFacturaPdf(
    user: AuthenticatedUser,
    nroCbte: string,
    tipoFac: string,
  ): Promise<{ fileName: string; content: Buffer }> {
    const factura = await this.getFacturaByComprobante(user, nroCbte, tipoFac);
    const html = buildFacturaHtmlTemplate(factura, user, this.env.appName);
    const content = await this.pdfService.renderPdfFromHtml(html);

    return {
      fileName: `factura-${factura.header.tipoFac}-${factura.header.nroCbte}.pdf`,
      content,
    };
  }

  private normalizeNroAbonado(value: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 2147483647) {
      throw new BadRequestException('Sesión inválida');
    }

    return parsed;
  }

  private normalizeNroCbte(value: string): number {
    const onlyNumbers = value.replace(/\D/g, '');
    const parsed = Number(onlyNumbers);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 999999999999) {
      throw new BadRequestException('Número de comprobante inválido');
    }

    return parsed;
  }

  private normalizeTipoFac(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!/^[A-Z]$/.test(normalized)) {
      throw new BadRequestException('Tipo de factura inválido');
    }

    return normalized;
  }
}
