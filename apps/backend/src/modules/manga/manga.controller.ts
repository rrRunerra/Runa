import { Controller, Param, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedQuery } from '@nestia/core';
import { MangaService } from './manga.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { SearchMangaDto } from './dto/search-manga.dto';
import { MangaSearchEntity } from './entities/manga-search.entity';
import { MangaEntity } from './entities/manga.entity';

@Controller('manga')
@UseGuards(DualAuthGuard)
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Public()
  @TypedRoute.Get('search')
  async search(
    @TypedQuery() query: SearchMangaDto,
  ): Promise<MangaSearchEntity> {
    return this.mangaService.search(query.name);
  }

  @Public()
  @TypedRoute.Get(':id')
  async getManga(@Param('id') id: string): Promise<MangaEntity> {
    return this.mangaService.getManga(parseInt(id));
  }
}
