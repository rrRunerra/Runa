import { Controller, Post } from '@nestjs/common';
import { TypedBody, TypedRoute } from '@nestia/core';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { LoginAuthDto } from './dto/login-auth.dto';
import { AuthResponseEntity } from './entities/auth-response.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @TypedRoute.Post('login')
  async login(@TypedBody() data: LoginAuthDto): Promise<AuthResponseEntity> {
    return this.authService.login(data);
  }
}
