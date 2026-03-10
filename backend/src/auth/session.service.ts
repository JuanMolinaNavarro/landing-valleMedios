import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Response } from 'express';

import { loadEnv } from '../config/env';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

interface SessionPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

@Injectable()
export class SessionService {
  private readonly env = loadEnv();

  createSession(user: AuthenticatedUser): string {
    const now = Date.now();
    const payload: SessionPayload = {
      ...user,
      iat: now,
      exp: now + this.env.sessionTtlMinutes * 60 * 1000,
    };

    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  readSession(cookieValue?: string): AuthenticatedUser {
    if (!cookieValue) {
      throw new UnauthorizedException('Session not found');
    }

    const [encodedPayload, signature] = cookieValue.split('.');
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid session token');
    }

    const expectedSignature = this.sign(encodedPayload);
    const validSignature =
      expectedSignature.length === signature.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    if (!validSignature) {
      throw new UnauthorizedException('Invalid session signature');
    }

    let payload: SessionPayload;
    try {
      payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as SessionPayload;
    } catch {
      throw new UnauthorizedException('Invalid session payload');
    }

    if (Date.now() > payload.exp) {
      throw new UnauthorizedException('Session expired');
    }

    return {
      nroAbonado: payload.nroAbonado,
      nroDoc: payload.nroDoc,
      nombre: payload.nombre,
    };
  }

  setSessionCookie(response: Response, sessionToken: string): void {
    response.cookie(this.env.sessionCookieName, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.cookieSecure,
      domain: this.env.cookieDomain,
      maxAge: this.env.sessionTtlMinutes * 60 * 1000,
      path: '/',
    });
  }

  clearSessionCookie(response: Response): void {
    response.clearCookie(this.env.sessionCookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.cookieSecure,
      domain: this.env.cookieDomain,
      path: '/',
    });
  }

  private sign(input: string): string {
    return createHmac('sha256', this.env.sessionSecret).update(input).digest('base64url');
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
}
