import { Injectable } from '@nestjs/common';
import { Int, NVarChar } from 'mssql';

import { DatabaseService } from '../database/database.service';

interface AbonadoRecord {
  nroAbonado: number;
  nroDoc: string;
  nombre: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByCredentials(nroAbonado: number, nroDoc: string): Promise<AbonadoRecord | null> {
    const pool = await this.databaseService.getPool();
    const result = await pool
      .request()
      .input('nroAbonado', Int, nroAbonado)
      .input('nroDoc', NVarChar(15), nroDoc).query<AbonadoRecord>(`
        SELECT TOP (1)
          a.nroAbonado AS nroAbonado,
          CAST(a.nroDoc AS varchar(15)) AS nroDoc,
          COALESCE(
            NULLIF(
              LTRIM(
                RTRIM(
                  CONCAT(
                    COALESCE(CAST(a.apeTitu AS varchar(120)), ''),
                    ' ',
                    COALESCE(CAST(a.nomTitu AS varchar(120)), '')
                  )
                )
              ),
              ''
            ),
            NULLIF(
              LTRIM(
                RTRIM(
                  CONCAT(
                    COALESCE(CAST(a.apeFact AS varchar(120)), ''),
                    ' ',
                    COALESCE(CAST(a.nomFact AS varchar(120)), '')
                  )
                )
              ),
              ''
            ),
            'Abonado'
          ) AS nombre
        FROM dbo.tbAbonado a
        WHERE a.nroAbonado = @nroAbonado
          AND REPLACE(REPLACE(REPLACE(REPLACE(a.nroDoc, '.', ''), '-', ''), '/', ''), ' ', '') = @nroDoc
      `);

    return result.recordset[0] ?? null;
  }
}
