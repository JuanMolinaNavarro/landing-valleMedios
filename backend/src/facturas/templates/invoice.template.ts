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
        <td class="col-item">${escapeHtml(item.item)}</td>
        <td>${escapeHtml(asText(item.descripcion) || '-')}</td>
        <td class="amount-cell">${escapeHtml(formatMoney(item.impItemNeto))}</td>
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
        <td class="amount-cell">${escapeHtml(formatMoney(row.importe))}</td>
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
          --bg: #ffffff;
          --ink: #172033;
          --muted: #5b6679;
          --line: #d7dfea;
          --line-strong: #a7b3c7;
          --head: #eef2f8;
          --accent: #17385f;
          --accent-soft: #f2f6fc;
          --tipo-bg: #7b8597;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif;
          font-size: 12px;
        }

        .sheet {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 18px;
          background: var(--bg);
        }

        .top {
          display: grid;
          grid-template-columns: 230px 62px 1fr;
          gap: 14px;
          align-items: start;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 132px;
        }

        .brand-logo {
          width: 215px;
          max-width: 100%;
          height: auto;
          display: block;
        }

        .brand-fallback {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: var(--accent);
        }

        .tipo-box {
          border: 1px solid #5d6678;
          background: var(--tipo-bg);
          color: #ffffff;
          width: 62px;
          height: 132px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }

        .tipo-letra {
          font-size: 30px;
          line-height: 1;
          font-weight: 800;
        }

        .tipo-codigo {
          font-size: 11px;
          line-height: 1.1;
          text-align: center;
          letter-spacing: 0.4px;
        }

        .header-right {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .doc-head {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .doc-head td {
          padding: 2px 0;
          vertical-align: top;
        }

        .doc-label {
          width: 140px;
          color: var(--muted);
        }

        .issuer-block {
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--accent-soft);
          padding: 8px 10px;
          font-size: 11px;
          line-height: 1.35;
        }

        .issuer-block .iva {
          margin-top: 3px;
          font-weight: 700;
          color: var(--accent);
        }

        .main {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 12px;
        }

        .info-card,
        .venc-card,
        .debt-box {
          border: 1px solid var(--line);
          border-radius: 10px;
          background: #ffffff;
        }

        .info-card {
          padding: 10px 12px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table td {
          padding: 4px 2px;
          vertical-align: top;
          border-bottom: 1px dashed #e6ebf3;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table .field {
          width: 122px;
          color: var(--muted);
          font-weight: 700;
          white-space: nowrap;
        }

        .venc-card {
          overflow: hidden;
        }

        .venc-title {
          margin: 0;
          padding: 8px 10px;
          background: var(--head);
          border-bottom: 1px solid var(--line);
          color: var(--accent);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.6px;
          text-align: center;
        }

        .venc-periodo {
          margin: 0;
          padding: 6px 10px;
          font-size: 11px;
          color: var(--muted);
          border-bottom: 1px solid #eef2f8;
        }

        .venc-table {
          width: 100%;
          border-collapse: collapse;
        }

        .venc-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #eef2f8;
        }

        .venc-table tr:last-child td {
          border-bottom: none;
        }

        .right {
          text-align: right;
          white-space: nowrap;
        }

        .section {
          margin-top: 14px;
          border: 1px solid var(--line);
          border-radius: 10px;
          overflow: hidden;
          background: #ffffff;
        }

        .section table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .section th {
          background: var(--head);
          color: var(--accent);
          text-align: left;
          font-size: 12px;
          font-weight: 800;
          padding: 9px 10px;
          border-bottom: 1px solid var(--line);
          letter-spacing: 0.4px;
        }

        .section td {
          padding: 8px 10px;
          border-bottom: 1px solid #eef2f8;
        }

        .concepts-table .amount-head,
        .concepts-table .amount-cell {
          width: 168px;
          text-align: right;
          white-space: nowrap;
        }

        .section tbody tr:last-child td {
          border-bottom: none;
        }

        .col-item {
          width: 36px;
          text-align: center;
          color: var(--muted);
        }

        .debt-box {
          margin-top: 14px;
          overflow: hidden;
        }

        .debt-title {
          margin: 0;
          padding: 9px 10px;
          background: var(--head);
          border-bottom: 1px solid var(--line);
          color: var(--accent);
          font-size: 12px;
          font-weight: 800;
        }

        .debt-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .debt-table th {
          text-align: left;
          padding: 8px 10px;
          color: #30435f;
          font-size: 11px;
          background: #f9fbff;
          border-bottom: 1px solid var(--line);
        }

        .debt-table td {
          padding: 7px 10px;
          border-bottom: 1px solid #eef2f8;
        }

        .debt-table .amount-head,
        .debt-table .amount-cell {
          width: 130px;
          text-align: right;
          white-space: nowrap;
        }

        .debt-table tr:last-child td {
          border-bottom: none;
        }

        .phones {
          margin-top: 14px;
          border: 1px dashed var(--line-strong);
          border-radius: 10px;
          padding: 8px 10px;
          color: #2f3d56;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 11px;
        }

        .phones strong {
          color: #0f1f35;
          font-weight: 800;
        }

        .barcode {
          margin-top: 14px;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 8px 10px;
          background: #ffffff;
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
          font-size: 44px;
          font-weight: normal;
        }

        .barcode-bars--fallback {
          font-family: "Courier New", monospace;
          font-size: 12px;
          letter-spacing: 0.9px;
        }

        .barcode-digits {
          margin-top: 4px;
          font-family: "Courier New", monospace;
          font-size: 10px;
          letter-spacing: 0.35px;
          color: #334159;
        }

        .totals-wrap {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
        }

        .totals {
          width: 320px;
          border-collapse: collapse;
          border: 1px solid #c5d0e1;
          border-radius: 10px;
          overflow: hidden;
        }

        .totals td {
          background: #f4f7fc;
          padding: 8px 10px;
          font-size: 12px;
          border-bottom: 1px solid #dfe6f1;
        }

        .totals tr:last-child td {
          border-bottom: none;
        }

        .totals .label {
          color: #445770;
          font-weight: 700;
          width: 45%;
        }

        .totals .value {
          width: 55%;
          text-align: right;
          font-weight: 700;
        }

        .totals .total-row td {
          background: #eaf0fa;
          color: #0e2540;
          font-weight: 900;
        }

        .totals .total-row .total-cell {
          font-weight: 900;
          font-size: 13px;
        }

        .cae-table {
          margin-top: 8px;
          width: 100%;
          border-collapse: collapse;
        }

        .cae-table td {
          padding: 2px 4px;
          color: #4b5a71;
          font-size: 11px;
        }

        .cae-right {
          text-align: right;
        }

        .legal {
          margin-top: 10px;
          border-top: 1px solid var(--line);
          padding-top: 8px;
          color: #5a6477;
          font-size: 10px;
          line-height: 1.35;
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
            <table class="doc-head" aria-label="Cabecera de comprobante">
              <tr>
                <td><strong>Factura ${escapeHtml(tipoFac)}</strong></td>
                <td class="doc-label">Nro. de Comprobante:</td>
                <td class="right">${escapeHtml(factura.header.nroCbte)}</td>
              </tr>
              <tr>
                <td></td>
                <td class="doc-label">Fecha de emision:</td>
                <td class="right">${escapeHtml(asText(factura.header.fecEmision))}</td>
              </tr>
            </table>

            <div class="issuer-block">
              <div>CUIT: 30-71613589-2</div>
              <div>ING. BRUTOS: 901 - 606800-5</div>
              <div>FECHA INC: 30/11/2010</div>
              <div class="iva">I.V.A. ${escapeHtml(asUpper(situacionIva))}</div>
            </div>
          </div>
        </div>

        <div class="main">
          <div class="info-card">
            <table class="data-table" aria-label="Datos del abonado">
              <tr>
                <td class="field">Abonado</td>
                <td>${escapeHtml(factura.header.nroAbonado)}</td>
              </tr>
              <tr>
                <td class="field">Nombre</td>
                <td>${escapeHtml(clienteNombre)}</td>
              </tr>
              <tr>
                <td class="field">Domicilio</td>
                <td>${escapeHtml(asText(factura.header.domicilio))}</td>
              </tr>
              <tr>
                <td class="field">Localidad</td>
                <td>${escapeHtml(asText(factura.header.domLocal))}</td>
              </tr>
              <tr>
                <td class="field">I.V.A. / C.U.I.T.</td>
                <td>${escapeHtml(situacionIva)} | ${escapeHtml(cuitCliente)}</td>
              </tr>
              <tr>
                <td class="field">Condicion</td>
                <td>Cuenta Corriente</td>
              </tr>
              <tr>
                <td class="field">Cobrador</td>
                <td>${escapeHtml(formatCobrador(factura.header.cobrador))}</td>
              </tr>
            </table>
          </div>

          <div class="venc-card">
            <p class="venc-title">VENCIMIENTOS</p>
            <p class="venc-periodo">Periodo: ${escapeHtml(periodo.anio)} / ${escapeHtml(periodo.mes)}</p>
            <table class="venc-table" aria-label="Vencimientos">
              <tbody>
                ${renderVencimientosRows(factura)}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <table class="concepts-table" aria-label="Conceptos de factura">
            <colgroup>
              <col style="width: 40px;" />
              <col />
              <col style="width: 168px;" />
            </colgroup>
            <thead>
              <tr>
                <th colspan="2">CONCEPTOS</th>
                <th class="amount-head">IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              ${renderItemsRows(factura)}
            </tbody>
          </table>
        </div>

        <div class="debt-box">
          <p class="debt-title">Detalle de Comprobantes Vencidos No Abonados</p>
          <table class="debt-table" aria-label="Comprobantes adeudados">
            <colgroup>
              <col style="width: 22%;" />
              <col style="width: 28%;" />
              <col style="width: 26%;" />
              <col style="width: 24%;" />
            </colgroup>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Numero</th>
                <th>Fecha 1er Vto.</th>
                <th class="amount-head">Importe</th>
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

        <div class="totals-wrap">
          <table class="totals" aria-label="Totales">
            <tr>
              <td class="label">SubTotal $</td>
              <td class="value">${escapeHtml(formatMoney(subtotal))}</td>
            </tr>
            <tr>
              <td class="label">I.V.A. $</td>
              <td class="value">${escapeHtml(formatMoney(factura.header.iva))}</td>
            </tr>
            <tr class="total-row">
              <td class="label">TOTAL $</td>
              <td class="value total-cell">${escapeHtml(formatMoney(factura.header.impNetoVto1))}</td>
            </tr>
          </table>
        </div>

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
