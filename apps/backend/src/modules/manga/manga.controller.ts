import { Controller, Get, Param, UseGuards, Post } from '@nestjs/common';
import { MangaService } from './manga.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { AquilaFlags } from '@runa/permissions';
import type { MangaSearchEntity, MangaEntity } from './manga.entities';
import { SearchMangaDto, MangaDetailDto, MangaRefreshDto } from './manga.dto';

@Controller('manga')
@UseGuards(AuthGuard)
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Public()
  @Get('search/:name')
  async search(@Param() params: SearchMangaDto): Promise<MangaSearchEntity[]> {
    return this.mangaService.search(params.name);
  }

  @Public()
  @Get(':id')
  async mangaDetail(
    @Param() params: MangaDetailDto,
  ): Promise<MangaEntity | undefined> {
    return await this.mangaService.getManga(params.id);
  }

  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshAnime(
    @Param() params: MangaRefreshDto,
  ): Promise<MangaEntity | undefined | null> {
    return await this.mangaService.refreshManga(params.id);
  }
}
