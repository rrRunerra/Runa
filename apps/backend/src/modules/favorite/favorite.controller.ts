import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Query,
  Req,
} from '@nestjs/common';

import { FavoriteType } from '@runa/database';

import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  rrBadRequestException,
  rrUnauthorizedException,
} from 'src/providers/error';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';

import { FavoriteService } from './favorite.service';
import { AddFavoriteDto } from './favorite.dto';
import type {
  FavoriteEntity,
  FavoriteStatusEntity,
  FavoriteSuccessEntity,
  ResolvedFavoriteEntity,
} from './favorite.entities';

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoriteController {
  private readonly moduleCode = 'FeCtr-';

  constructor(private readonly favoriteService: FavoriteService) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parseType(raw: string): FavoriteType {
    const upper = raw.toUpperCase();
    if (!Object.values(FavoriteType).includes(upper as FavoriteType)) {
      throw new rrBadRequestException(`${this.moduleCode}IT001`, {
        message: `Invalid type: ${raw}. Must be one of: ${Object.values(FavoriteType).join(', ')}`,
      });
    }
    return upper as FavoriteType;
  }

  private userId(req: ExtendedRequest): string {
    const id = req.user?.id;
    if (!id) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA001`, {
        message: 'Unauthenticated',
      });
    }
    return id;
  }

  // ---------------------------------------------------------------------------
  // POST /favorites — add to collection
  // ---------------------------------------------------------------------------

  @Post()
  async addFavorite(
    @Req() req: ExtendedRequest,
    @Body() dto: AddFavoriteDto,
  ): Promise<FavoriteEntity> {
    return this.favoriteService.addFavorite(this.userId(req), dto);
  }

  // ---------------------------------------------------------------------------
  // GET /favorites — my collection
  // ---------------------------------------------------------------------------

  @Get()
  async getFavorites(
    @Req() req: ExtendedRequest,
    @Query('type') type?: string,
  ): Promise<FavoriteEntity[]> {
    const favoriteType = type ? this.parseType(type) : undefined;
    return this.favoriteService.getFavorites(this.userId(req), favoriteType);
  }

  // ---------------------------------------------------------------------------
  // GET /favorites/user/:username — public collection (must be before /:type/:targetId)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('user/:username')
  async getUserFavorites(
    @Param('username') username: string,
    @Query('type') type?: string,
  ): Promise<ResolvedFavoriteEntity[]> {
    const favoriteType = type ? this.parseType(type) : undefined;
    return this.favoriteService.getFavoritesByUsername(username, favoriteType);
  }

  // ---------------------------------------------------------------------------
  // GET /favorites/:type/:targetId/status — singleton status
  // ---------------------------------------------------------------------------

  @Get(':type/:targetId/status')
  async getFavoriteStatus(
    @Req() req: ExtendedRequest,
    @Param('type') type: string,
    @Param('targetId') targetId: string,
  ): Promise<FavoriteStatusEntity> {
    return this.favoriteService.getFavoriteStatus(
      this.userId(req),
      this.parseType(type),
      targetId,
    );
  }

  // ---------------------------------------------------------------------------
  // DELETE /favorites/:type/:targetId — remove singleton
  // ---------------------------------------------------------------------------

  @Delete(':type/:targetId')
  async removeFavorite(
    @Req() req: ExtendedRequest,
    @Param('type') type: string,
    @Param('targetId') targetId: string,
  ): Promise<FavoriteSuccessEntity> {
    return this.favoriteService.removeFavorite(
      this.userId(req),
      this.parseType(type),
      targetId,
    );
  }
}
