import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthGuard } from '../common/guards/auth.guard';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const { user, sessionToken } = await this.authService.login(body);
    this.sessionService.setSessionCookie(response, sessionToken);

    return { user };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response): { message: string } {
    this.sessionService.clearSessionCookie(response);
    return { message: 'Sesión cerrada' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  me(@CurrentUser() user: AuthenticatedUser): { user: AuthenticatedUser } {
    return { user };
  }
}
