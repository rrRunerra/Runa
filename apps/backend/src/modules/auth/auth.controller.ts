import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { LoginAuthDto } from './dto/login-auth.dto';
import { AuthResponseEntity } from './entities/auth-response.entity';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({default: {limit: 10, ttl: 60000}})
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: LoginAuthDto): Promise<AuthResponseEntity> {
    return this.authService.login(data);
  }

  @Public()
  @Post('mfa/send-email-code')
  @Throttle({default: {limit: 5, ttl: 60000}})
  @HttpCode(HttpStatus.OK)
  async sendMfaEmailCode(@Body('tempToken') tempToken: string) {
    return this.authService.sendMfaEmailCode(tempToken);
  }

  @Public()
  @Post('mfa/verify')
  @Throttle({default: {limit: 10, ttl: 60000}})
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Body('tempToken') tempToken: string,
    @Body('method') method: string,
    @Body('code') code?: string,
    @Body('passkeyResponse') passkeyResponse?: any,
  ) {
    return this.authService.verifyMfa(tempToken, method, code, passkeyResponse);
  }

  @Public()
  @Post('passkey/login-options')
  @Throttle({default: {limit: 10, ttl: 60000}})
  @HttpCode(HttpStatus.OK)
  async generatePasskeyLoginOptions(@Body('identifier') identifier?: string) {
    return this.authService.generatePasskeyLoginOptions(identifier);
  }

  @Public()
  @Post('passkey/login-verify')
  @Throttle({default: {limit: 10, ttl: 60000}})
  @HttpCode(HttpStatus.OK)
  async verifyPasskeyLogin(
    @Body('identifier') identifier: string | undefined,
    @Body('passkeyResponse') passkeyResponse: any,
  ) {
    return this.authService.verifyPasskeyLogin(identifier, passkeyResponse);
  }
}
