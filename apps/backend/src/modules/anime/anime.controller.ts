import { Controller, Param, UseGuards, Get, Query } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { AnimeSearchEntity } from './entities/anime-search.entity';
import { AnimeEntity } from './entities/anime.entity';

@Controller('anime')
@UseGuards(DualAuthGuard)
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  @Public()
  @Get('search')
  async search(
    @Query() query: { name: string },
  ): Promise<AnimeSearchEntity> {
    return this.animeService.search(query.name);
  }

  @Public()
  @Get(':id')
  async getAnime(@Param('id') id: string): Promise<AnimeEntity> {
    return this.animeService.getAnime(parseInt(id));
  }
}
