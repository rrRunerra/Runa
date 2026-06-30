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
import { jwtVerify } from 'jose';

import { ConnectionLinkedTo } from '@runa/database';
import { AquilaFlags } from '@runa/permissions';

import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { ConnectionService } from './connection.service';
import { UpsertConnectionDto } from './dto/upsert-connection.dto';
import { RemoveConnectionDto } from './dto/remove-connection.dto';
import { ConnectionEntity } from './entities/connection.entity';

@Controller('connections')
@UseGuards(AuthGuard, PermissionsGuard)
export class ConnectionController {
  private readonly moduleCode = 'CnCtr-';

  constructor(private readonly connectionService: ConnectionService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('linkedTo') linkedTo?: ConnectionLinkedTo,
    @Query('capabilities') capabilities?: string | string[],
  ): Promise<ConnectionEntity[]> {
    const username = req.user.username;
    return this.connectionService.findAll(username, linkedTo, capabilities);
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
      private: body.private,
      metadata: body.metadata,
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
  ): Promise<void> {
    const authUrl = await this.connectionService.getAuthUrl(
      provider,
      token,
      redirectUrl,
    );
    return res.redirect(authUrl);
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const [token, redirectUrl] = (state || '').split(':::');
    const targetUrl = this.getSafeRedirectUrl(redirectUrl);
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

  @Post(':provider/import')
  @Permissions([AquilaFlags.IMPORT_LIST])
  async importList(
    @Req() req: any,
    @Param('provider') provider: string,
    @Body() body?: { mediaTypes?: string[] },
  ): Promise<{ status: string }> {
    const username = req.user.username;
    return this.connectionService.startImport(
      username,
      provider,
      body?.mediaTypes,
    );
  }

  @Get(':provider/import/status')
  @Permissions([AquilaFlags.IMPORT_LIST])
  async importStatus(
    @Req() req: any,
    @Param('provider') provider: string,
  ): Promise<{ total: number; processed: number; status: string }> {
    const username = req.user.username;
    return this.connectionService.getImportStatus(username, provider);
  }

  private getSafeRedirectUrl(url: string): string {
    const allowedOrigin =
      process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'; // DevSkim: ignore DS137138, DS162092
    const defaultUrl = `${allowedOrigin}/polaris/connections`;
    if (!url) return defaultUrl;

    try {
      const parsedUrl = new URL(url, allowedOrigin);
      const allowedUrl = new URL(allowedOrigin);

      // Check if it's a relative URL to prevent protocol-relative redirects
      if (
        url.startsWith('/') &&
        !url.startsWith('//') &&
        !url.startsWith('\\')
      ) {
        return `${allowedOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }

      if (
        parsedUrl.hostname === allowedUrl.hostname &&
        parsedUrl.port === allowedUrl.port &&
        parsedUrl.protocol === allowedUrl.protocol
      ) {
        return `${allowedOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }
    } catch {
      // Ignore invalid URLs
    }

    return defaultUrl;
  }

  private async decodeToken(token: string): Promise<{ username: string }> {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return { username: payload.name as string };
  }
}
