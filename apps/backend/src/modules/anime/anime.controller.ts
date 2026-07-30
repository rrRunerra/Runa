import { Controller, Param, UseGuards, Get, Post, Query } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import type { AnimeSearchEntity, AnimeEntity } from './anime.entities';
import { AquilaFlags } from '@runa/permissions';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { AnimeDetailDto, SearchAnimeDto, AnimeRefreshDto } from './anime.dto';

@Controller('anime')
@UseGuards(AuthGuard, PermissionsGuard)
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  @Public()
  @Get('search/:name')
  async search(@Param() params: SearchAnimeDto): Promise<AnimeSearchEntity[]> {
    return this.animeService.search(params.name);
  }

  @Public()
  @Get(':id/similar')
  async getSimilar(@Param() params: AnimeDetailDto | any): Promise<any[]> {
    const rawId = typeof params === 'object' && params !== null && 'id' in params ? params.id : params;
    return await this.animeService.getSimilarAnime(Number(rawId));
  }

  @Public()
  @Get(':id')
  async animeDetail(
    @Param() params: AnimeDetailDto,
  ): Promise<AnimeEntity> {
    return await this.animeService.getAnime(params.id);
  }

  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshAnime(
    @Param() params: AnimeRefreshDto,
    @Query('force') forceQuery?: string,
  ): Promise<AnimeEntity | null> {
    const force = forceQuery === 'true' || forceQuery === '1';
    return await this.animeService.refreshAnime(
      params.id,
      force,
    );
  }
}
