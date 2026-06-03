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
  BadRequestException,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { FavoriteType } from '@runa/database';
import { Public } from '../../common/decorators/public.decorator';

@Controller('favorites')
@UseGuards(DualAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  private parseType(type: string): FavoriteType {
    const upperType = type.toUpperCase();
    if (!Object.values(FavoriteType).includes(upperType as FavoriteType)) {
      throw new BadRequestException(
        `Invalid type: ${type}. Must be one of: ${Object.values(FavoriteType).join(', ')}`,
      );
    }
    return upperType as FavoriteType;
  }

  @Post()
  async addFavorite(@Req() req: any, @Body() dto: CreateFavoriteDto) {
    return this.favoriteService.addFavorite(req.user.id, dto);
  }

  @Delete(':type/:mediaId')
  async removeFavorite(
    @Req() req: any,
    @Param('type') type: string,
    @Param('mediaId') mediaId: string,
  ) {
    const favoriteType = this.parseType(type);
    return this.favoriteService.removeFavorite(req.user.id, favoriteType, mediaId);
  }

  @Get()
  async getFavorites(@Req() req: any, @Query('type') type?: string) {
    const favoriteType = type ? this.parseType(type) : undefined;
    return this.favoriteService.getFavorites(req.user.id, favoriteType);
  }

  @Public()
  @Get('user/:username')
  async getUserFavorites(
    @Param('username') username: string,
    @Query('type') type?: string,
  ) {
    const favoriteType = type ? this.parseType(type) : undefined;
    return this.favoriteService.getFavoritesByUsername(username, favoriteType);
  }

  @Get('status/:type/:mediaId')
  async getFavoriteStatus(
    @Req() req: any,
    @Param('type') type: string,
    @Param('mediaId') mediaId: string,
  ) {
    const favoriteType = this.parseType(type);
    return this.favoriteService.getFavoriteStatus(req.user.id, favoriteType, mediaId);
  }
}
