import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { SessionService } from '../../auth/session.service';
import { loadEnv } from '../../config/env';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly env = loadEnv();

  constructor(private readonly sessionService: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieValue = request.cookies?.[this.env.sessionCookieName] as string | undefined;
    request.user = this.sessionService.readSession(cookieValue);
    return true;
  }
}
