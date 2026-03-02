import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { TypedRoute } from '@nestia/core';
import { UpsertConnectionDto } from './dto/upsert-connection.dto';
import { RemoveConnectionDto } from './dto/remove-connection.dto';
import { ConnectionEntity } from './entities/connection.entity';

@Controller('connection')
@UseGuards(DualAuthGuard)
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @TypedRoute.Get()
  async findAll(@Req() req: any): Promise<ConnectionEntity[]> {
    // Check if system override is provided in headers (safer for GET than Body)
    const userIdOverride = req.headers['x-user-id'];
    const userId =
      req.user.id === 'system' && userIdOverride ? userIdOverride : req.user.id;
    return this.connectionService.findAll(userId);
  }

  @TypedRoute.Post()
  async upsert(
    @Req() req: any,
    @Body() body: UpsertConnectionDto,
  ): Promise<ConnectionEntity> {
    // If authenticated via internal API key (system), allow overriding the user ID
    const userId =
      req.user.id === 'system' && body.userId ? body.userId : req.user.id;

    return this.connectionService.upsert(userId, {
      provider: body.provider,
      username: body.username,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      connectionId: body.connectionId,
    });
  }

  @TypedRoute.Delete(':provider')
  async remove(
    @Req() req: any,
    @Param('provider') provider: string,
    @Body() body: RemoveConnectionDto,
  ): Promise<{ success: boolean }> {
    const userId =
      req.user.id === 'system' && body.userId ? body.userId : req.user.id;

    return this.connectionService.remove(userId, provider);
  }
}
