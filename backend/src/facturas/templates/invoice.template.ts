import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

import { FacturaDetalleRecord, FacturaItemRecord } from '../facturas.repository';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function asText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function createFallbackItem(factura: FacturaDetalleRecord): FacturaItemRecord {
  return {
    item: 1,
    descripcion: factura.header.txtObs || 'Servicio mensual',
    impItemNeto: factura.header.impNetoVto1,
    iva: factura.header.iva,
    providers: null,
  };
}

function renderItemsRows(factura: FacturaDetalleRecord): string {
  const items = factura.items.length > 0 ? factura.items : [createFallbackItem(factura)];
  return items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.item)}</td>
        <td>${escapeHtml(asText(item.descripcion) || '-')}</td>
        <td class="right">${escapeHtml(formatMoney(item.impItemNeto))}</td>
      </tr>
    `,
    )
    .join('');
}

function renderVencimientosRows(factura: FacturaDetalleRecord): string {
  const vencimientos = [
    { fecha: factura.header.fecVto1, importe: factura.header.impNetoVto1 },
    { fecha: factura.header.fecVto2, importe: factura.header.impNetoVto2 },
    { fecha: factura.header.fecVto3, importe: factura.header.impNetoVto3 },
  ].filter((row) => asText(row.fecha) !== '');

  return vencimientos
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(asText(row.fecha))}</td>
        <td class="right">${escapeHtml(formatMoney(row.importe))}</td>
      </tr>
    `,
    )
    .join('');
}

export function buildFacturaHtmlTemplate(
  factura: FacturaDetalleRecord,
  user: AuthenticatedUser,
  appName: string,
  barcodeFontDataUri?: string | null,
): string {
  const subtotal = factura.header.impNetoVto1 - factura.header.iva;
  const hasBarcodeFont = Boolean(asText(barcodeFontDataUri));
  const barcodeEncodedValue = asText(factura.header.barCode);
  const barcodeDigits = asText(factura.header.barDigito);
  const barcodeLine = hasBarcodeFont && barcodeEncodedValue ? barcodeEncodedValue : barcodeDigits;

  return `
  <!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Factura ${escapeHtml(factura.header.nroCbte)} - ${escapeHtml(appName)}</title>
      <style>
        ${
          hasBarcodeFont
            ? `
        @font-face {
          font-family: "PF_I2OF5";
          src: url("${escapeHtml(barcodeFontDataUri)}") format("truetype");
          font-weight: normal;
          font-style: normal;
        }
        `
            : ''
        }
        :root {
          color-scheme: light;
        }
        body {
          margin: 0;
          padding: 18px;
          font-family: "Segoe UI", Tahoma, sans-serif;
          color: #111;
          background: #fff;
        }
        .sheet {
          border: 1px solid #d1d5db;
          padding: 16px;
        }
        .header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: start;
        }
        .brand {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .muted {
          margin: 0;
          color: #4b5563;
          font-size: 12px;
        }
        .header-meta {
          border: 1px solid #d1d5db;
          padding: 10px;
          font-size: 13px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .data {
          margin-top: 12px;
        }
        .data td {
          padding: 2px 4px;
          vertical-align: top;
        }
        .section-title {
          margin-top: 14px;
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 700;
          border-bottom: 1px solid #111;
        }
        .grid {
          border: 1px solid #111;
        }
        .grid th {
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1px solid #111;
          font-size: 12px;
        }
        .grid td {
          padding: 6px 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .grid tbody tr:last-child td {
          border-bottom: none;
        }
        .right {
          text-align: right;
          white-space: nowrap;
        }
        .totals {
          margin-top: 10px;
          width: 100%;
          border-top: 1px solid #111;
        }
        .totals td {
          padding: 6px 8px;
          font-size: 12px;
        }
        .barcode {
          margin-top: 16px;
          font-family: "Courier New", monospace;
          font-size: 10px;
          word-break: break-all;
        }
        .barcode-bars {
          margin-top: 14px;
          letter-spacing: 0;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
        }
        .barcode-bars--font {
          font-family: "PF_I2OF5", "Courier New", monospace;
          font-size: 42px;
          font-weight: normal;
        }
        .barcode-bars--fallback {
          font-family: "Courier New", monospace;
          font-size: 12px;
          letter-spacing: 1px;
        }
        .barcode-digits {
          margin-top: 6px;
          font-family: "Courier New", monospace;
          font-size: 10px;
          letter-spacing: 0.8px;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div>
            <p class="brand">${escapeHtml(appName)}</p>
            <p class="muted">Factura ${escapeHtml(factura.header.tipoFac)} - Nro ${escapeHtml(factura.header.nroCbte)}</p>
            <p class="muted">Fecha: ${escapeHtml(asText(factura.header.fecEmision))}</p>
          </div>
          <div class="header-meta">
            <div><strong>Abonado:</strong> ${escapeHtml(factura.header.nroAbonado)}</div>
            <div><strong>Cliente:</strong> ${escapeHtml(asText(factura.header.apeNom) || user.nombre)}</div>
            <div><strong>CUIT:</strong> ${escapeHtml(asText(factura.header.cuit))}</div>
            <div><strong>I.V.A.:</strong> ${escapeHtml(asText(factura.header.desSitIva))}</div>
            <div><strong>Periodo:</strong> ${escapeHtml(asText(factura.header.periodo))}</div>
          </div>
        </div>

        <table class="data" aria-label="Datos de cliente">
          <tr>
            <td><strong>Domicilio:</strong></td>
            <td>${escapeHtml(asText(factura.header.domicilio))}</td>
          </tr>
          <tr>
            <td><strong>Referencia:</strong></td>
            <td>${escapeHtml(asText(factura.header.domRef))}</td>
          </tr>
          <tr>
            <td><strong>Localidad:</strong></td>
            <td>${escapeHtml(asText(factura.header.domLocal))}</td>
          </tr>
          <tr>
            <td><strong>Cobrador:</strong></td>
            <td>${escapeHtml(asText(factura.header.cobrador))}</td>
          </tr>
        </table>

        <p class="section-title">Vencimientos</p>
        <table class="grid" aria-label="Vencimientos">
          <thead>
            <tr>
              <th>Fecha</th>
              <th class="right">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${renderVencimientosRows(factura)}
          </tbody>
        </table>

        <p class="section-title">Conceptos</p>
        <table class="grid" aria-label="Conceptos de factura">
          <thead>
            <tr>
              <th style="width: 42px;">#</th>
              <th>Descripción</th>
              <th class="right">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${renderItemsRows(factura)}
          </tbody>
        </table>

        <table class="totals" aria-label="Totales">
          <tr>
            <td><strong>Subtotal</strong></td>
            <td class="right">${escapeHtml(formatMoney(subtotal))}</td>
          </tr>
          <tr>
            <td><strong>I.V.A.</strong></td>
            <td class="right">${escapeHtml(formatMoney(factura.header.iva))}</td>
          </tr>
          <tr>
            <td><strong>Total</strong></td>
            <td class="right"><strong>${escapeHtml(formatMoney(factura.header.impNetoVto1))}</strong></td>
          </tr>
        </table>

        <div class="barcode">
          <div class="barcode-bars ${hasBarcodeFont ? 'barcode-bars--font' : 'barcode-bars--fallback'}">${escapeHtml(barcodeLine)}</div>
          <div class="barcode-digits">${escapeHtml(barcodeDigits || barcodeEncodedValue)}</div>
        </div>
      </div>
    </body>
  </html>
`;
}
