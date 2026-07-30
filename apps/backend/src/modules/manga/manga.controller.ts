import { Controller, Get, Param, UseGuards, Post, Query, Body } from '@nestjs/common';
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
  @Get('search')
  async searchByQuery(@Query('q') q?: string): Promise<MangaSearchEntity[]> {
    if (!q) return [];
    return this.mangaService.search(q);
  }

  @Public()
  @Get('search/:name')
  async search(@Param() params: SearchMangaDto): Promise<MangaSearchEntity[]> {
    return this.mangaService.search(params.name);
  }

  @Public()
  @Get(':id/similar')
  async getSimilar(@Param() params: MangaDetailDto | any): Promise<any[]> {
    const rawId = typeof params === 'object' && params !== null && 'id' in params ? params.id : params;
    return await this.mangaService.getSimilarManga(Number(rawId));
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
  async refreshManga(
    @Param() params: MangaRefreshDto,
    @Query('force') forceQuery?: string,
  ): Promise<MangaEntity | undefined | null> {
    const force = forceQuery === 'true' || forceQuery === '1';
    return await this.mangaService.refreshManga(
      params.id,
      ...(forceQuery !== undefined ? [force] : []),
    );
  }

  @Post('ensure')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async ensureManga(
    @Body()
    body: {
      anilistId: number;
      malId?: number | null;
      title?: string;
      coverImage?: string;
    },
  ): Promise<any> {
    return await this.mangaService.ensureManga(
      body.anilistId,
      body.malId,
      body.title,
      body.coverImage,
    );
  }
}
