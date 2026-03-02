import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TypedRoute } from '@nestia/core';
import { Public } from '../../common/decorators/public.decorator';
import { DualAuthGuard } from 'src/common/guards/auth.guard';
import {
  NoAuthResponseEntity,
  SessionResponseEntity,
  ApiKeyResponseEntity,
} from './entities/test-response.entity';

@Controller('test')
@UseGuards(DualAuthGuard)
export class TestController {
  @Public()
  @TypedRoute.Get('noauth')
  async noAuth(): Promise<NoAuthResponseEntity> {
    return {
      message: 'This is a public endpoint. No authentication required.',
      timestamp: new Date().toISOString(),
    };
  }

  @TypedRoute.Get('session')
  async session(@Req() req: any): Promise<SessionResponseEntity> {
    return {
      message: 'This endpoint is protected by session/cookie authentication.',
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  @TypedRoute.Get('apikey')
  async apiKey(@Req() req: any): Promise<ApiKeyResponseEntity> {
    return {
      message: 'This endpoint is protected by API Key authentication.',
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }
}
