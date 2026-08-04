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
import { rrUnauthorizedException } from 'src/providers/error';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';

import { ConnectionService } from './connection.service';
import { UpsertConnectionDto } from './connection.dto';
import type { ConnectionEntity } from './connection.entities';

@Controller('connections')
@UseGuards(AuthGuard, PermissionsGuard)
export class ConnectionController {
  private readonly moduleCode = 'CnCtr-';

  constructor(private readonly connectionService: ConnectionService) {}

  private username(req: ExtendedRequest): string {
    const uname = req.user?.username;
    if (!uname) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA001`, {
        message: 'Unauthenticated',
      });
    }
    return uname;
  }

  // ---------------------------------------------------------------------------
  // GET /connections — collection
  // ---------------------------------------------------------------------------

  @Get()
  async findAll(
    @Req() req: ExtendedRequest,
    @Query('linkedTo') linkedTo?: ConnectionLinkedTo,
    @Query('capabilities') capabilities?: string | string[],
  ): Promise<ConnectionEntity[]> {
    return this.connectionService.findAll(
      this.username(req),
      linkedTo,
      capabilities,
    ) as Promise<ConnectionEntity[]>;
  }

  // ---------------------------------------------------------------------------
  // POST /connections/save — upsert singleton
  // ---------------------------------------------------------------------------

  @Post('save')
  async save(
    @Req() req: ExtendedRequest,
    @Body() body: UpsertConnectionDto,
  ): Promise<ConnectionEntity> {
    return this.connectionService.upsert(this.username(req), {
      provider: body.provider,
      linkedUsername: body.linkedUsername,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      connectionId: body.connectionId,
      linkedTo: body.linkedTo,
      private: body.private,
      metadata: body.metadata,
    }) as Promise<ConnectionEntity>;
  }

  // ---------------------------------------------------------------------------
  // DELETE /connections/remove/:provider — remove singleton
  // ---------------------------------------------------------------------------

  @Delete('remove/:provider')
  async remove(
    @Req() req: ExtendedRequest,
    @Param('provider') provider: string,
  ): Promise<{ success: boolean }> {
    return this.connectionService.remove(this.username(req), provider);
  }

  // ---------------------------------------------------------------------------
  // GET /connections/:provider/connect — OAuth redirect
  // ---------------------------------------------------------------------------

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
    res.redirect(authUrl);
  }

  // ---------------------------------------------------------------------------
  // GET /connections/:provider/callback — OAuth callback (public)
  // ---------------------------------------------------------------------------

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    let rawState = state ?? '';
    try {
      if (rawState && !rawState.includes(':::')) {
        rawState = Buffer.from(rawState, 'base64url').toString('utf8');
      }
    } catch {
      // Fallback to raw string if decoding fails
    }

    const [token, redirectUrl] = rawState.split(':::');
    const targetUrl = this.getSafeRedirectUrl(redirectUrl);
    const separator = targetUrl.includes('?') ? '&' : '?';

    try {
      const user = await this.decodeToken(token);
      await this.connectionService.handleCallback(
        provider,
        code,
        user.username,
      );
      res.redirect(`${targetUrl}${separator}success=true`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OAuth failed';
      res.redirect(
        `${targetUrl}${separator}error=oauth_failed&message=${encodeURIComponent(message)}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // POST /connections/:provider/import — import list
  // ---------------------------------------------------------------------------

  @Post(':provider/import')
  @Permissions([AquilaFlags.IMPORT_LIST])
  async importList(
    @Req() req: ExtendedRequest,
    @Param('provider') provider: string,
    @Body() body?: { mediaTypes?: string[] },
  ): Promise<{ status: string }> {
    return this.connectionService.startImport(
      this.username(req),
      provider,
      body?.mediaTypes,
    );
  }

  // ---------------------------------------------------------------------------
  // GET /connections/:provider/import/status
  // ---------------------------------------------------------------------------

  @Get(':provider/import/status')
  @Permissions([AquilaFlags.IMPORT_LIST])
  importStatus(
    @Req() req: ExtendedRequest,
    @Param('provider') provider: string,
  ): { total: number; processed: number; status: string; error?: string } {
    return this.connectionService.getImportStatus(this.username(req), provider);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getSafeRedirectUrl(url: string): string {
    const allowedOrigin =
      process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'; // DevSkim: ignore DS137138, DS162092
    const defaultUrl = `${allowedOrigin}/polaris/connections`;
    if (!url) return defaultUrl;

    try {
      const parsedUrl = new URL(url, allowedOrigin);
      const allowedUrl = new URL(allowedOrigin);

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
