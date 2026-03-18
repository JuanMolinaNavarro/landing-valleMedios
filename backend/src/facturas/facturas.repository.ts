import { Injectable } from '@nestjs/common';
import { Decimal, Int, NVarChar } from 'mssql';

import { DatabaseService } from '../database/database.service';

export interface FacturaResumenRecord {
  nroAbonado: number;
  nroCbte: number;
  tipoFac: string;
  fecEmision: string | null;
  periodo: string | null;
  apeNom: string | null;
  impNetoVto1: number;
  fecVto1: string | null;
}

export interface FacturaHeaderRecord {
  nroAbonado: number;
  nroCbte: number;
  tipoFac: string;
  fecEmision: string | null;
  apeNom: string | null;
  domicilio: string | null;
  domRef: string | null;
  domLocal: string | null;
  cobrador: string | null;
  desSitIva: string | null;
  cuit: string | null;
  periodo: string | null;
  fecVto1: string | null;
  fecVto2: string | null;
  fecVto3: string | null;
  impNetoVto1: number;
  impNetoVto2: number;
  impNetoVto3: number;
  iva: number;
  nroCae: string | null;
  fevtoCae: string | null;
  barCode: string | null;
  barDigito: string | null;
  txtObs: string | null;
  linkPagos: string | null;
  dirEmail: string | null;
}

export interface FacturaItemRecord {
  item: number;
  descripcion: string | null;
  impItemNeto: number;
  iva: number;
  providers: string | null;
}

export interface FacturaDeudaRecord {
  nro: number;
  nroCbte: number;
  tipoFac: string;
  tipCbte: string | null;
  fechaVto: string | null;
  importe: number;
  isCurrent?: boolean;
}

export interface FacturaDetalleRecord {
  header: FacturaHeaderRecord;
  items: FacturaItemRecord[];
  deuda: FacturaDeudaRecord[];
}

@Injectable()
export class FacturasRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByAbonado(nroAbonado: number): Promise<FacturaResumenRecord[]> {
    const pool = await this.databaseService.getPool();
    const result = await pool
      .request()
      .input('nroAbonado', Int, nroAbonado).query<FacturaResumenRecord>(`
        SELECT
          f.nroAbonado AS nroAbonado,
          CAST(f.nroCbte AS decimal(12, 0)) AS nroCbte,
          UPPER(LTRIM(RTRIM(f.TipoFac))) AS tipoFac,
          MAX(NULLIF(LTRIM(RTRIM(f.fecEmision)), '')) AS fecEmision,
          MAX(NULLIF(LTRIM(RTRIM(f.Periodo)), '')) AS periodo,
          MAX(NULLIF(LTRIM(RTRIM(f.ApeNom)), '')) AS apeNom,
          MAX(f.impNetoVto1) AS impNetoVto1,
          MAX(NULLIF(LTRIM(RTRIM(f.fecVto1)), '')) AS fecVto1
        FROM dbo.FacturaOnline f
        WHERE f.nroAbonado = @nroAbonado
        GROUP BY
          f.nroAbonado,
          CAST(f.nroCbte AS decimal(12, 0)),
          UPPER(LTRIM(RTRIM(f.TipoFac)))
        ORDER BY CAST(f.nroCbte AS decimal(12, 0)) DESC
      `);

    return result.recordset;
  }

  async findHeaderByAbonado(
    nroAbonado: number,
    nroCbte: number,
    tipoFac: string,
  ): Promise<FacturaHeaderRecord | null> {
    const pool = await this.databaseService.getPool();
    const result = await pool
      .request()
      .input('nroAbonado', Int, nroAbonado)
      .input('nroCbte', Decimal(12, 0), nroCbte)
      .input('tipoFac', NVarChar(1), tipoFac).query<FacturaHeaderRecord>(`
        SELECT TOP (1)
          f.nroAbonado AS nroAbonado,
          CAST(f.nroCbte AS decimal(12, 0)) AS nroCbte,
          UPPER(LTRIM(RTRIM(f.TipoFac))) AS tipoFac,
          NULLIF(LTRIM(RTRIM(f.fecEmision)), '') AS fecEmision,
          NULLIF(LTRIM(RTRIM(f.ApeNom)), '') AS apeNom,
          NULLIF(LTRIM(RTRIM(f.Domicilio)), '') AS domicilio,
          NULLIF(LTRIM(RTRIM(f.domRef)), '') AS domRef,
          NULLIF(LTRIM(RTRIM(f.domLocal)), '') AS domLocal,
          NULLIF(LTRIM(RTRIM(f.Cobrador)), '') AS cobrador,
          NULLIF(LTRIM(RTRIM(f.desSitIVA)), '') AS desSitIva,
          NULLIF(LTRIM(RTRIM(f.CUIT)), '') AS cuit,
          NULLIF(LTRIM(RTRIM(f.Periodo)), '') AS periodo,
          NULLIF(LTRIM(RTRIM(f.fecVto1)), '') AS fecVto1,
          NULLIF(LTRIM(RTRIM(f.fecVto2)), '') AS fecVto2,
          NULLIF(LTRIM(RTRIM(f.fecVto3)), '') AS fecVto3,
          f.impNetoVto1 AS impNetoVto1,
          f.impNetoVto2 AS impNetoVto2,
          f.impNetoVto3 AS impNetoVto3,
          f.Iva AS iva,
          NULLIF(LTRIM(RTRIM(CAST(f.NroCae AS varchar(20)))), '') AS nroCae,
          NULLIF(LTRIM(RTRIM(CAST(f.FevtoCae AS varchar(20)))), '') AS fevtoCae,
          NULLIF(LTRIM(RTRIM(f.BarCode)), '') AS barCode,
          NULLIF(LTRIM(RTRIM(f.BarDigito)), '') AS barDigito,
          NULLIF(LTRIM(RTRIM(f.txtObs)), '') AS txtObs,
          NULLIF(LTRIM(RTRIM(f.LinkPagos)), '') AS linkPagos,
          NULLIF(LTRIM(RTRIM(f.dirEmail)), '') AS dirEmail
        FROM dbo.FacturaOnline f
        WHERE f.nroAbonado = @nroAbonado
          AND CAST(f.nroCbte AS decimal(12, 0)) = @nroCbte
          AND UPPER(LTRIM(RTRIM(f.TipoFac))) = @tipoFac
        ORDER BY CAST(f.nroCbte AS decimal(12, 0)) DESC
      `);

    return result.recordset[0] ?? null;
  }

  async findItemsByAbonado(
    nroAbonado: number,
    nroCbte: number,
    tipoFac: string,
  ): Promise<FacturaItemRecord[]> {
    const pool = await this.databaseService.getPool();
    const result = await pool
      .request()
      .input('nroAbonado', Int, nroAbonado)
      .input('nroCbte', Decimal(12, 0), nroCbte)
      .input('tipoFac', NVarChar(1), tipoFac).query<FacturaItemRecord>(`
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY NULLIF(LTRIM(RTRIM(g.Descripcion)), ''), g.impItemNeto DESC
          ) AS item,
          NULLIF(LTRIM(RTRIM(g.Descripcion)), '') AS descripcion,
          g.impItemNeto AS impItemNeto,
          g.Iva AS iva,
          NULLIF(LTRIM(RTRIM(g.Providers)), '') AS providers
        FROM dbo.FacturaOnlineGrilla g
        WHERE g.nroAbonado = @nroAbonado
          AND CAST(g.nroCbte AS decimal(12, 0)) = @nroCbte
          AND UPPER(RIGHT(RTRIM(g.TipC), 1)) = @tipoFac
      `);

    return result.recordset;
  }

  async findDeudaByAbonado(nroAbonado: number): Promise<FacturaDeudaRecord[]> {
    const pool = await this.databaseService.getPool();
    const result = await pool
      .request()
      .input('nroAbonado', Int, nroAbonado).query<FacturaDeudaRecord>(`
        SELECT
          d.Nro AS nro,
          CAST(d.nroCbte AS decimal(12, 0)) AS nroCbte,
          UPPER(RIGHT(RTRIM(d.tipCbte), 1)) AS tipoFac,
          NULLIF(LTRIM(RTRIM(d.tipCbte)), '') AS tipCbte,
          NULLIF(LTRIM(RTRIM(d.FechaVto)), '') AS fechaVto,
          d.Importe AS importe
        FROM dbo.FacturaOnlineCbteDeuda d
        WHERE d.Nro = @nroAbonado
        ORDER BY CAST(d.nroCbte AS decimal(12, 0)) DESC
      `);

    return result.recordset;
  }
}
