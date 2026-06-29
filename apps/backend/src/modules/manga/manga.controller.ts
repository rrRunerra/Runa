import {
  Controller,
  Param,
  UseGuards,
  Get,
  Query,
  Injectable,
  Post,
  Req,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MangaService } from './manga.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { SearchMangaDto } from './dto/search-manga.dto';
import { MangaSearchEntity } from './entities/manga-search.entity';
import { MangaEntity } from './entities/manga.entity';
import { AquilaBitField } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';

@Controller('manga')
@UseGuards(DualAuthGuard)
export class MangaController {
  constructor(
    private readonly mangaService: MangaService,
    private readonly cacheService: CacheService,
  ) {}

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

  @Post('refresh/:id')
  async refreshManga(@Param('id') id: string, @Req() req: any): Promise<MangaEntity> {
    const bitfield = AquilaBitField.fromRaw(req.user.permissions);
    if (!bitfield.has('MEDIA_REFRESH')) {
      throw new ForbiddenException('You do not have permission to refresh media');
    }

    const cooldownKey = `cooldown:refresh:manga:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new HttpException(
        'This media was refreshed recently. Please wait before refreshing again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.mangaService.getManga(parseInt(id), true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
