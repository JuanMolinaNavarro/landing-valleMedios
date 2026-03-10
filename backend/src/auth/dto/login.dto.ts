import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nroAbonado!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nroDoc!: string;
}
