import { Controller, Post, Get, Body, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
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
  @Post('mfa/device/send')
  @Throttle({default: {limit: 5, ttl: 60000}})
  @HttpCode(HttpStatus.OK)
  async sendDeviceMfaCode(
    @Body('tempToken') tempToken: string,
    @Body('deviceId') deviceId: string,
  ) {
    return this.authService.sendDeviceMfaCode(tempToken, deviceId);
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

  @Public()
  @Post('login-code/generate')
  @Throttle({default: {limit: 5, ttl: 60000}})
  @HttpCode(HttpStatus.OK)
  async generateLoginCode() {
    return this.authService.generateLoginCode();
  }

  @Public()
  @Get('login-code/status')
  @Throttle({default: {limit: 60, ttl: 60000}})
  @HttpCode(HttpStatus.OK)
  async getLoginCodeStatus(@Query('code') code: string) {
    return this.authService.getLoginCodeStatus(code);
  }

  @Post('login-code/link')
  @HttpCode(HttpStatus.OK)
  async linkLoginCode(@Req() req: any, @Body('code') code: string) {
    return this.authService.linkLoginCode(req.user.id, code);
  }
}
