import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class FacturaParamsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^\d+$/, { message: 'nroCbte debe ser numérico' })
  nroCbte!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1)
  @Matches(/^[A-Za-z]$/, { message: 'tipoFac debe ser una letra' })
  tipoFac!: string;
}
