import { Controller, Param, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedQuery } from '@nestia/core';
import { AnimeService } from './anime.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { SearchAnimeDto } from './dto/search-anime.dto';
import { AnimeSearchEntity } from './entities/anime-search.entity';
import { AnimeEntity } from './entities/anime.entity';

@Controller('anime')
@UseGuards(DualAuthGuard)
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  @Public()
  @TypedRoute.Get('search')
  async search(
    @TypedQuery() query: SearchAnimeDto,
  ): Promise<AnimeSearchEntity> {
    return this.animeService.search(query.name);
  }

  @Public()
  @TypedRoute.Get(':id')
  async getAnime(@Param('id') id: string): Promise<AnimeEntity> {
    return this.animeService.getAnime(parseInt(id));
  }
}
