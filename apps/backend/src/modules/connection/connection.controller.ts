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

@Controller('connections')
@UseGuards(DualAuthGuard)
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('linkedTo') linkedTo?: ConnectionLinkedTo,
  ): Promise<ConnectionEntity[]> {
    // Check if system override is provided in headers (safer for GET than Body)
    const userIdOverride = req.headers['x-user-id'];
    const userId =
      req.user.id === 'system' && userIdOverride ? userIdOverride : req.user.id;
    return this.connectionService.findAll(userId, linkedTo);
  }

  @Post('save')
  async save(
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
      linkedTo: body.linkedTo,
    });
  }

  @Delete('remove/:provider')
  async remove(
    @Req() req: any,
    @Param('provider') provider: string,
    @Body() body: RemoveConnectionDto,
  ): Promise<{ success: boolean }> {
    const userId =
      req.user.id === 'system' && body.userId ? body.userId : req.user.id;

    return this.connectionService.remove(userId, provider);
  }

  @Get(':provider/connect')
  async connect(
    @Param('provider') provider: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const authUrl = await this.connectionService.getAuthUrl(provider, token);
    return res.redirect(authUrl);
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string, // state contains the token
    @Res() res: Response,
  ) {
    try {
      // Manual auth check using state token
      const authHeader = `Bearer ${state}`;
      // We call the service which will eventually call upsert.
      // But we need the userId. We can either decode the token here or pass it to service.
      // Better: we can actually use the Guard if we adjust it, but for now let's pass token to service.
      // The service could decode it or we can decode it here.

      // Actually, let's just use the handleCallback with the token as 'state'
      // We need to decode the sub (userId) from the token.
      const user = await this.decodeToken(state);

      await this.connectionService.handleCallback(provider, code, user.id);

      const frontendUrl = process.env.NEXT_PUBLIC_URL;
      return res.redirect(`${frontendUrl}/polaris/connections?success=true`);
    } catch (error) {
      const frontendUrl = process.env.NEXT_PUBLIC_URL;
      return res.redirect(
        `${frontendUrl}/polaris/connections?error=oauth_failed&message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  private async decodeToken(token: string) {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return { id: payload.sub as string };
  }
}
