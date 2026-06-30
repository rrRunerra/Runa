import {
  Controller,
  Param,
  UseGuards,
  Get,
  Query,
  Injectable,
  Post,
} from '@nestjs/common';
import { MangaService } from './manga.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';
import { SearchMangaDto } from './dto/search-manga.dto';
import { MangaSearchEntity } from './entities/manga-search.entity';
import { MangaEntity } from './entities/manga.entity';
import { AquilaFlags } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';
import { rrTooManyRequestsException } from 'src/providers/error';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('manga')
@UseGuards(AuthGuard, PermissionsGuard)
export class MangaController {
  private readonly moduleCode = 'MaCtr-';

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
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshManga(@Param('id') id: string): Promise<MangaEntity> {
    const cooldownKey = `cooldown:refresh:manga:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRRPWBRA001`, {
        message:
          'This media was refreshed recently. Please wait before refreshing again.',
      });
    }

    const result = await this.mangaService.getManga(parseInt(id), true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
