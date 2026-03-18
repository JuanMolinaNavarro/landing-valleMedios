import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

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
  private readonly logger = new Logger(FacturasService.name);
  private barcodeFontDataUriCache: string | null | undefined;
  private logoDataUriCache: string | null | undefined;

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

    const deudaRaw = await this.facturasRepository.findDeudaByAbonado(nroAbonado);
    const deuda = deudaRaw.map((row) => ({
      ...row,
      isCurrent: row.nroCbte === normalizedNroCbte && row.tipoFac === normalizedTipoFac,
    }));

    return { header, items, deuda };
  }

  async getFacturaPdf(
    user: AuthenticatedUser,
    nroCbte: string,
    tipoFac: string,
  ): Promise<{ fileName: string; content: Buffer }> {
    const factura = await this.getFacturaByComprobante(user, nroCbte, tipoFac);
    const html = buildFacturaHtmlTemplate(
      factura,
      user,
      this.env.appName,
      this.getBarcodeFontDataUri(),
      this.getLogoDataUri(),
    );
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

  private getBarcodeFontDataUri(): string | null {
    if (this.barcodeFontDataUriCache !== undefined) {
      return this.barcodeFontDataUriCache;
    }

    const fontPaths = [
      join(process.cwd(), 'src', 'assets', 'fonts', 'PF_I2OF5_0.TTF'),
      join(process.cwd(), 'assets', 'fonts', 'PF_I2OF5_0.TTF'),
      join(process.cwd(), 'dist', 'assets', 'fonts', 'PF_I2OF5_0.TTF'),
      join(__dirname, '..', 'assets', 'fonts', 'PF_I2OF5_0.TTF'),
    ];

    for (const fontPath of fontPaths) {
      try {
        const fileBuffer = readFileSync(fontPath);
        this.barcodeFontDataUriCache = `data:font/ttf;base64,${fileBuffer.toString('base64')}`;
        return this.barcodeFontDataUriCache;
      } catch {
        // Try next location.
      }
    }

    this.logger.warn(
      'Barcode font PF_I2OF5_0.TTF not found. Falling back to plain text barcode.',
    );
    this.barcodeFontDataUriCache = null;
    return null;
  }

  private getLogoDataUri(): string | null {
    if (this.logoDataUriCache !== undefined) {
      return this.logoDataUriCache;
    }

    const logoPaths = [
      join(process.cwd(), 'src', 'assets', 'images', 'vallemediosVertical.png'),
      join(process.cwd(), 'assets', 'images', 'vallemediosVertical.png'),
      join(process.cwd(), 'dist', 'assets', 'images', 'vallemediosVertical.png'),
      join(process.cwd(), '..', 'frontend', 'public', 'img', 'vallemediosVertical.png'),
      join(__dirname, '..', 'assets', 'images', 'vallemediosVertical.png'),
    ];

    for (const logoPath of logoPaths) {
      try {
        const fileBuffer = readFileSync(logoPath);
        this.logoDataUriCache = `data:image/png;base64,${fileBuffer.toString('base64')}`;
        return this.logoDataUriCache;
      } catch {
        // Try next location.
      }
    }

    this.logger.warn(
      'Logo file vallemediosVertical.png not found. Rendering PDF without logo image.',
    );
    this.logoDataUriCache = null;
    return null;
  }
}
