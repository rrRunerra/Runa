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
}
