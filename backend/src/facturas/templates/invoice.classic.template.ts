import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

import { FacturaDetalleRecord, FacturaDeudaRecord, FacturaItemRecord } from '../facturas.repository';

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

function asUpper(value: string | null | undefined): string {
  return asText(value).toUpperCase();
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
        <td class="num-col">${escapeHtml(item.item)}</td>
        <td class="desc-col">${escapeHtml(asText(item.descripcion) || '-')}</td>
        <td class="amt-col right">${escapeHtml(formatMoney(item.impItemNeto))}</td>
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

  if (vencimientos.length === 0) {
    return `
      <tr>
        <td>-</td>
        <td class="right">0,00</td>
      </tr>
    `;
  }

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

function formatTipoComprobante(row: FacturaDeudaRecord): string {
  if (asText(row.tipCbte)) {
    return `Factura ${asText(row.tipoFac)}`;
  }

  return `Factura ${asText(row.tipoFac)}`;
}

function formatCbteNumber(value: number): string {
  const padded = String(value).padStart(12, '0');
  return `${padded.slice(0, 4)}-${padded.slice(4)}`;
}

function renderDeudaRows(factura: FacturaDetalleRecord): string {
  if (factura.deuda.length === 0) {
    return `
      <tr>
        <td colspan="4">Sin comprobantes adeudados.</td>
      </tr>
    `;
  }

  return factura.deuda
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(formatTipoComprobante(row))}</td>
        <td>${escapeHtml(formatCbteNumber(row.nroCbte))}</td>
        <td>${escapeHtml(asText(row.fechaVto))}</td>
        <td class="right">${escapeHtml(formatMoney(row.importe))}</td>
      </tr>
    `,
    )
    .join('');
}

function splitPeriodo(periodo: string): { anio: string; mes: string } {
  const cleaned = asText(periodo);
  if (!cleaned.includes('/')) {
    return { anio: cleaned || '-', mes: '-' };
  }

  const [anioRaw, mesRaw] = cleaned.split('/');
  const anio = asText(anioRaw) || '-';
  const mes = asText(mesRaw) || '-';
  return { anio, mes };
}

function formatCobrador(value: string | null | undefined): string {
  const base = asText(value);
  if (!base) {
    return '-';
  }

  if (base.startsWith('(P)')) {
    return base;
  }

  return `(P) ${base}`;
}

export function buildFacturaHtmlTemplate(
  factura: FacturaDetalleRecord,
  user: AuthenticatedUser,
  appName: string,
  barcodeFontDataUri?: string | null,
  logoDataUri?: string | null,
): string {
  const subtotal = factura.header.impNetoVto1 - factura.header.iva;
  const hasBarcodeFont = Boolean(asText(barcodeFontDataUri));
  const barcodeEncodedValue = asText(factura.header.barCode);
  const barcodeDigits = asText(factura.header.barDigito);
  const barcodeLine = hasBarcodeFont && barcodeEncodedValue ? barcodeEncodedValue : barcodeDigits;
  const hasLogo = Boolean(asText(logoDataUri));
  const periodo = splitPeriodo(factura.header.periodo ?? '');
  const tipoFac = asUpper(factura.header.tipoFac) || '-';
  const cuitCliente = asText(factura.header.cuit) || '-';
  const situacionIva = asText(factura.header.desSitIva) || '-';
  const clienteNombre = asText(factura.header.apeNom) || user.nombre;
  const primerVencimiento = asText(factura.header.fecVto1) || '-';

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
          padding: 0;
          font-family: "Times New Roman", Times, serif;
          color: #111111;
          background: #ffffff;
          font-size: 12px;
        }
        .sheet {
          width: 100%;
          max-width: 660px;
          margin: 0 auto;
          background: #ffffff;
        }
        .top {
          display: grid;
          grid-template-columns: 270px 62px 1fr;
          gap: 10px;
          align-items: start;
        }
        .brand-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 2px;
        }
        .brand-logo {
          width: 250px;
          max-width: 100%;
          height: auto;
          display: block;
        }
        .brand-fallback {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        }
        .tipo-box {
          border: 2px solid #111111;
          background: #9e9e9e;
          width: 52px;
          height: 126px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          box-sizing: border-box;
        }
        .tipo-letra {
          font-size: 40px;
          line-height: 1;
          font-weight: 700;
        }
        .tipo-codigo {
          font-size: 14px;
          line-height: 1.05;
          text-align: center;
        }
        .header-right table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .header-right td {
          padding: 2px 2px;
          vertical-align: top;
          white-space: nowrap;
        }
        .header-right .label {
          width: 62px;
        }
        .issuer-block {
          margin-top: 6px;
          font-size: 10px;
          line-height: 1.2;
        }
        .main {
          margin-top: 2px;
          display: grid;
          grid-template-columns: 1fr 190px;
          gap: 6px;
        }
        .data-table,
        .venc-table,
        .concepts,
        .debt-table,
        .totals,
        .cae-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table td {
          padding: 2px 2px;
          vertical-align: top;
          font-size: 12px;
        }
        .data-table .field {
          width: 110px;
          white-space: nowrap;
        }
        .venc-wrap {
          margin-top: 2px;
        }
        .venc-title {
          text-align: center;
          font-size: 12px;
          margin-bottom: 2px;
        }
        .venc-table td {
          padding: 2px 4px;
          font-size: 12px;
        }
        .right {
          text-align: right;
          white-space: nowrap;
        }
        .concepts {
          margin-top: 4px;
          border: 2px solid #222222;
          font-size: 12px;
        }
        .concepts th {
          background: #c8c8c8;
          font-weight: 400;
          border-bottom: 1px solid #444444;
          padding: 6px 8px;
        }
        .concepts td {
          padding: 2px 8px;
        }
        .concepts .num-col {
          width: 24px;
          text-align: right;
        }
        .concepts .desc-col {
          width: auto;
        }
        .concepts .amt-col {
          width: 150px;
          text-align: right;
        }
        .debt-box {
          margin-top: 106px;
          border: 1px solid #222222;
          padding: 8px 12px 2px;
        }
        .debt-title {
          margin: 0 0 6px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: underline;
        }
        .debt-table th,
        .debt-table td {
          text-align: left;
          padding: 1px 0;
          font-size: 12px;
        }
        .debt-table th.right,
        .debt-table td.right {
          text-align: right;
        }
        .phones {
          margin-top: 64px;
          font-size: 12px;
          line-height: 1.22;
        }
        .phones strong {
          font-weight: 700;
        }
        .barcode {
          margin-top: 4px;
        }
        .barcode-bars {
          margin-top: 2px;
          letter-spacing: 0;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
        }
        .barcode-bars--font {
          font-family: "PF_I2OF5", "Courier New", monospace;
          font-size: 50px;
          font-weight: normal;
        }
        .barcode-bars--fallback {
          font-family: "Courier New", monospace;
          font-size: 13px;
          letter-spacing: 1px;
        }
        .barcode-digits {
          margin-top: 2px;
          font-family: "Courier New", monospace;
          font-size: 10px;
          letter-spacing: 0.45px;
        }
        .totals {
          margin-top: 8px;
          border: 1px solid #222222;
        }
        .totals td {
          background: #c8c8c8;
          padding: 4px 8px;
          font-size: 12px;
        }
        .totals .total-cell strong {
          font-size: 13px;
        }
        .cae-table td {
          padding: 1px 8px 0;
          font-size: 12px;
        }
        .cae-right {
          text-align: right;
        }
        .legal {
          margin-top: 2px;
          border-top: 1px solid #111111;
          padding-top: 3px;
          font-size: 11px;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="top">
          <div class="brand-wrap">
            ${
              hasLogo
                ? `<img class="brand-logo" src="${escapeHtml(logoDataUri)}" alt="${escapeHtml(appName)}" />`
                : `<p class="brand-fallback">${escapeHtml(appName)}</p>`
            }
          </div>
          <div class="tipo-box">
            <div class="tipo-letra">${escapeHtml(tipoFac)}</div>
            <div class="tipo-codigo">COD<br />NRO<br />01</div>
          </div>
          <div class="header-right">
            <table aria-label="Cabecera de comprobante">
              <tr>
                <td>Factura ${escapeHtml(tipoFac)}</td>
                <td class="label">Nro.:</td>
                <td class="right">${escapeHtml(factura.header.nroCbte)}</td>
              </tr>
              <tr>
                <td></td>
                <td class="label">Fecha:</td>
                <td class="right">${escapeHtml(asText(factura.header.fecEmision))}</td>
              </tr>
            </table>
            <div class="issuer-block">
              <div>CUIT: 30-71613589-2</div>
              <div>ING. BRUTOS: 901 - 606800-5</div>
              <div>FECHA INC: 30/11/2010</div>
              <div>I.V.A. ${escapeHtml(asUpper(situacionIva))}</div>
            </div>
          </div>
        </div>

        <div class="main">
          <table class="data-table" aria-label="Datos del abonado">
            <tr>
              <td class="field">Abonado:</td>
              <td>${escapeHtml(factura.header.nroAbonado)}</td>
            </tr>
            <tr>
              <td class="field">Nombre:</td>
              <td>${escapeHtml(clienteNombre)}</td>
            </tr>
            <tr>
              <td class="field">Domicilio:</td>
              <td>${escapeHtml(asText(factura.header.domicilio))}</td>
            </tr>
            <tr>
              <td class="field">Ref. Domicilio:</td>
              <td>${escapeHtml(asText(factura.header.domRef))}</td>
            </tr>
            <tr>
              <td class="field">Localidad:</td>
              <td>${escapeHtml(asText(factura.header.domLocal))}</td>
            </tr>
            <tr>
              <td class="field">I.V.A.:</td>
              <td>${escapeHtml(situacionIva)}&nbsp;&nbsp;&nbsp;&nbsp;C.U.I.T:&nbsp;&nbsp;${escapeHtml(cuitCliente)}</td>
            </tr>
            <tr>
              <td class="field">Condicion:</td>
              <td>Cuenta Corriente&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${escapeHtml(periodo.anio)}&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;${escapeHtml(periodo.mes)}</td>
            </tr>
            <tr>
              <td class="field">Cobrador:</td>
              <td>${escapeHtml(formatCobrador(factura.header.cobrador))}</td>
            </tr>
          </table>
          <div class="venc-wrap">
            <div class="venc-title">VENCIMIENTOS</div>
            <table class="venc-table" aria-label="Vencimientos">
              <tbody>
                ${renderVencimientosRows(factura)}
              </tbody>
            </table>
          </div>
        </div>

        <table class="concepts" aria-label="Conceptos de factura">
          <thead>
            <tr>
              <th colspan="2">CONCEPTOS</th>
              <th class="amt-col">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            ${renderItemsRows(factura)}
          </tbody>
        </table>

        <div class="debt-box">
          <p class="debt-title">Detalle de Comprobantes Vencidos No Abonados</p>
          <table class="debt-table" aria-label="Comprobantes adeudados">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Numero</th>
                <th>Fecha 1er Vto.</th>
                <th class="right">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${renderDeudaRows(factura)}
            </tbody>
          </table>
        </div>

        <div class="phones">
          <div>Llamadas: <strong>0800-555-9434</strong></div>
          <div>Whatsapp: <strong>381-2367037</strong></div>
        </div>

        <div class="barcode">
          <div class="barcode-bars ${hasBarcodeFont ? 'barcode-bars--font' : 'barcode-bars--fallback'}">${escapeHtml(barcodeLine)}</div>
          <div class="barcode-digits">${escapeHtml(barcodeDigits || barcodeEncodedValue)}</div>
        </div>

        <table class="totals" aria-label="Totales">
          <tr>
            <td class="right">SubTotal $</td>
            <td class="right">${escapeHtml(formatMoney(subtotal))}</td>
            <td class="right">I.V.A. $</td>
            <td class="right">${escapeHtml(formatMoney(factura.header.iva))}</td>
            <td class="right">TOTAL $</td>
            <td class="right total-cell"><strong>${escapeHtml(formatMoney(factura.header.impNetoVto1))}</strong></td>
          </tr>
        </table>

        <table class="cae-table" aria-label="Datos de CAE">
          <tr>
            <td class="cae-right">Vto.:&nbsp;&nbsp;&nbsp;${escapeHtml(primerVencimiento)}</td>
            <td class="cae-right">C.A.E.Nro.&nbsp;&nbsp;&nbsp;${escapeHtml(asText(factura.header.nroCae) || '-')}</td>
          </tr>
        </table>

        <div class="legal">
          <div>Comprobante emitido conforme al regimen establecido por la R.G.2177 (AFIP) del 21/12/2006 - Factura Electronica</div>
          <div>Direccion de Comercio Interior de Tucuman - Direccion: 9 de Julio 497 - San Miguel de Tucuman - Tel 0381 4525080</div>
        </div>
      </div>
    </body>
  </html>
`;
}
