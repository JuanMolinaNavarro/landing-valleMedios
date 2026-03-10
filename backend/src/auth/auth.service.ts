import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { AuthRepository } from './auth.repository';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionService: SessionService,
  ) {}

  async login(payload: LoginDto): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
    const normalizedAbonado = this.normalizeAbonado(payload.nroAbonado);
    const normalizedDni = this.normalizeDni(payload.nroDoc);

    const abonado = await this.authRepository.findByCredentials(normalizedAbonado, normalizedDni);
    if (!abonado) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const user: AuthenticatedUser = {
      nroAbonado: String(abonado.nroAbonado),
      nroDoc: this.normalizeDni(String(abonado.nroDoc)),
      nombre: abonado.nombre,
    };

    return {
      user,
      sessionToken: this.sessionService.createSession(user),
    };
  }

  getCurrentUser(sessionCookie?: string): AuthenticatedUser {
    return this.sessionService.readSession(sessionCookie);
  }

  private normalizeAbonado(value: string): number {
    const onlyNumbers = value.replace(/\D/g, '');
    const parsed = Number(onlyNumbers);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 2147483647) {
      throw new UnauthorizedException('Número de abonado inválido');
    }

    return parsed;
  }

  private normalizeDni(value: string): string {
    const onlyNumbers = value.replace(/\D/g, '');
    if (!onlyNumbers || onlyNumbers.length > 15) {
      throw new UnauthorizedException('DNI inválido');
    }

    return onlyNumbers;
  }
}
