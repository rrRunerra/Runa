import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../../common/decorators/public.decorator';
import { rrUnauthorizedException } from 'src/providers/error';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';

import { AuthService } from './auth.service';
import { LoginAuthDto, LinkLoginCodeDto } from './auth.dto';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type {
  AuthResponseEntity,
  MfaRequiredEntity,
  MfaVerifyEntity,
  LoginCodeEntity,
  LoginCodeStatusEntity,
} from './auth.entities';

@Controller('auth')
export class AuthController {
  private readonly moduleCode = 'AhCtr-';

  constructor(private readonly authService: AuthService) {}

  private userId(req: ExtendedRequest): string {
    const id = req.user?.id;
    if (!id) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA001`, {
        message: 'Unauthenticated',
      });
    }
    return id;
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() data: LoginAuthDto,
  ): Promise<AuthResponseEntity | MfaRequiredEntity> {
    return this.authService.login(data);
  }

  @Public()
  @Post('mfa/send-email-code')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async sendMfaEmailCode(
    @Body('tempToken') tempToken: string,
  ): Promise<{ success: boolean }> {
    return this.authService.sendMfaEmailCode(tempToken);
  }

  @Public()
  @Post('mfa/send-recovery-code')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async sendMfaRecoveryCode(
    @Body('tempToken') tempToken: string,
  ): Promise<{ success: boolean }> {
    return this.authService.sendMfaRecoveryCode(tempToken);
  }

  @Public()
  @Post('mfa/device/send')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async sendDeviceMfaCode(
    @Body('tempToken') tempToken: string,
    @Body('deviceId') deviceId: string,
  ): Promise<{ success: boolean }> {
    return this.authService.sendDeviceMfaCode(tempToken, deviceId);
  }

  @Public()
  @Post('mfa/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Body('tempToken') tempToken: string,
    @Body('method') method: string,
    @Body('code') code?: string,
    @Body('passkeyResponse') passkeyResponse?: AuthenticationResponseJSON,
  ): Promise<MfaVerifyEntity> {
    return this.authService.verifyMfa(tempToken, method, code, passkeyResponse);
  }

  @Public()
  @Post('passkey/login-options')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async generatePasskeyLoginOptions(
    @Body('identifier') identifier?: string,
  ): Promise<object> {
    return this.authService.generatePasskeyLoginOptions(identifier);
  }

  @Public()
  @Post('passkey/login-verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verifyPasskeyLogin(
    @Body('identifier') identifier: string | undefined,
    @Body('passkeyResponse') passkeyResponse: AuthenticationResponseJSON,
  ): Promise<AuthResponseEntity> {
    return this.authService.verifyPasskeyLogin(identifier, passkeyResponse);
  }

  @Public()
  @Post('login-code/generate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async generateLoginCode(): Promise<LoginCodeEntity> {
    return this.authService.generateLoginCode();
  }

  @Public()
  @Get('login-code/status')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async getLoginCodeStatus(
    @Query('code') code: string,
  ): Promise<LoginCodeStatusEntity> {
    return this.authService.getLoginCodeStatus(code);
  }

  @Post('login-code/link')
  @HttpCode(HttpStatus.OK)
  async linkLoginCode(
    @Req() req: ExtendedRequest,
    @Body() body: LinkLoginCodeDto,
  ): Promise<{ success: boolean }> {
    return this.authService.linkLoginCode(this.userId(req), body.code);
  }
}
