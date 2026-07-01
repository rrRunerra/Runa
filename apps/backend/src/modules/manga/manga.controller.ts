import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MangaService } from './manga.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import type { MangaSearchEntity, MangaEntity } from './manga.entities';
import { SearchMangaDto, MangaDetailDto } from './manga.dto';

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
    @Param('id') params: MangaDetailDto,
  ): Promise<MangaEntity | null> {
    return await this.mangaService.getManga(params.id);
  }
}
