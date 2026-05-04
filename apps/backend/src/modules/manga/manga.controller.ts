import {
  Controller,
  Param,
  UseGuards,
  Get,
  Query,
  Injectable,
} from '@nestjs/common';
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
  @Get('search')
  async search(@Query() query: SearchMangaDto): Promise<MangaSearchEntity> {
    return this.mangaService.search(query.name);
  }

  @Public()
  @Get('details/:id')
  async getManga(@Param('id') id: string): Promise<MangaEntity> {
    return this.mangaService.getManga(parseInt(id));
  }
}
