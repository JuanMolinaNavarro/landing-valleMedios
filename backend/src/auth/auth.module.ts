import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AuthGuard } from '../common/guards/auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, SessionService, AuthGuard],
  exports: [SessionService, AuthGuard],
})
export class AuthModule {}
