import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConnectionLinkedTo } from '@runa/database';
import { ConnectionService } from './connection.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { UpsertConnectionDto } from './dto/upsert-connection.dto';
import { RemoveConnectionDto } from './dto/remove-connection.dto';
import { ConnectionEntity } from './entities/connection.entity';
import { Public } from 'src/common/decorators/public.decorator';
import { jwtVerify } from 'jose';

@Controller('connections')
@UseGuards(DualAuthGuard)
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('linkedTo') linkedTo?: ConnectionLinkedTo,
  ): Promise<ConnectionEntity[]> {
    const username = req.user.username;
    return this.connectionService.findAll(username, linkedTo);
  }

  @Post('save')
  async save(
    @Req() req: any,
    @Body() body: UpsertConnectionDto,
  ): Promise<ConnectionEntity> {
    const username = req.user.username;

    return this.connectionService.upsert(username, {
      provider: body.provider,
      linkedUsername: body.linkedUsername,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      connectionId: body.connectionId,
      linkedTo: body.linkedTo,
    });
  }

  @Delete('remove/:provider')
  async remove(
    @Req() req: any,
    @Param('provider') provider: string,
    @Body() body: RemoveConnectionDto,
  ): Promise<{ success: boolean }> {
    const username = req.user.username;
    return this.connectionService.remove(username, provider);
  }

  @Get(':provider/connect')
  async connect(
    @Param('provider') provider: string,
    @Query('token') token: string,
    @Query('redirectUrl') redirectUrl: string,
    @Res() res: Response,
  ) {
    const authUrl = await this.connectionService.getAuthUrl(provider, token, redirectUrl);
    return res.redirect(authUrl);
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const [token, redirectUrl] = (state || '').split(':::');
    const defaultUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/polaris/connections`;
    const targetUrl = redirectUrl || defaultUrl;
    const separator = targetUrl.includes('?') ? '&' : '?';

    try {
      const user = await this.decodeToken(token);

      await this.connectionService.handleCallback(
        provider,
        code,
        user.username,
      );

      return res.redirect(`${targetUrl}${separator}success=true`);
    } catch (error) {
      return res.redirect(
        `${targetUrl}${separator}error=oauth_failed&message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  private async decodeToken(token: string) {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return { username: payload.name as string };
  }
}
