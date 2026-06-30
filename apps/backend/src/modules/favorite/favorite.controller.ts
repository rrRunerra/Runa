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
import { rrBadRequestException } from 'src/providers/error';
import { FavoriteService } from './favorite.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { FavoriteType } from '@runa/database';
import { Public } from '../../common/decorators/public.decorator';

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoriteController {
  private readonly moduleCode = 'FeCtr-';

  constructor(private readonly favoriteService: FavoriteService) {}

  private parseType(type: string): FavoriteType {
    const upperType = type.toUpperCase();
    if (!Object.values(FavoriteType).includes(upperType as FavoriteType)) {
      throw new rrBadRequestException(`${this.moduleCode}IT001`, {
        message: `Invalid type: ${type}. Must be one of: ${Object.values(FavoriteType).join(', ')}`,
      });
    }
    return upperType as FavoriteType;
  }

  @Post()
  async addFavorite(
    @Req() req: any,
    @Body() dto: CreateFavoriteDto,
  ): Promise<import('@runa/database').Favorite> {
    return this.favoriteService.addFavorite(req.user.id, dto);
  }

  @Delete(':type/:mediaId')
  async removeFavorite(
    @Req() req: any,
    @Param('type') type: string,
    @Param('mediaId') mediaId: string,
  ): Promise<{ success: boolean }> {
    const favoriteType = this.parseType(type);
    return this.favoriteService.removeFavorite(
      req.user.id,
      favoriteType,
      mediaId,
    );
  }

  @Get()
  async getFavorites(
    @Req() req: any,
    @Query('type') type?: string,
  ): Promise<import('@runa/database').Favorite[]> {
    const favoriteType = type ? this.parseType(type) : undefined;
    return this.favoriteService.getFavorites(req.user.id, favoriteType);
  }

  @Public()
  @Get('user/:username')
  async getUserFavorites(
    @Param('username') username: string,
    @Query('type') type?: string,
  ): Promise<
    {
      id: string;
      userId: string;
      type: import('@runa/database').FavoriteType;
      mediaId: string;
      createdAt: Date;
      title: string;
      image: string;
    }[]
  > {
    const favoriteType = type ? this.parseType(type) : undefined;
    return this.favoriteService.getFavoritesByUsername(username, favoriteType);
  }

  @Get('status/:type/:mediaId')
  async getFavoriteStatus(
    @Req() req: any,
    @Param('type') type: string,
    @Param('mediaId') mediaId: string,
  ): Promise<{ favorited: boolean }> {
    const favoriteType = this.parseType(type);
    return this.favoriteService.getFavoriteStatus(
      req.user.id,
      favoriteType,
      mediaId,
    );
  }
}
