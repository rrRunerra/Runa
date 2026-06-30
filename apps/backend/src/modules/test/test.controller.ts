import { Controller, Req, UseGuards, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import {
  NoAuthResponseEntity,
  SessionResponseEntity,
  ApiKeyResponseEntity,
} from './entities/test-response.entity';

@Controller('test')
@UseGuards(AuthGuard)
export class TestController {
  private readonly moduleCode = 'TeCtr-';

  @Public()
  @Get('noauth')
  async noAuth(): Promise<NoAuthResponseEntity> {
    return {
      message: 'This is a public endpoint. No authentication required.',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('session')
  async session(@Req() req: any): Promise<SessionResponseEntity> {
    return {
      message: 'This endpoint is protected by session/cookie authentication.',
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('apikey')
  async apiKey(@Req() req: any): Promise<ApiKeyResponseEntity> {
    return {
      message: 'This endpoint is protected by API Key authentication.',
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }
}
