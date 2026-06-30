import { Controller, Param, UseGuards, Get, Query, Post } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { AnimeSearchEntity } from './entities/anime-search.entity';
import { AnimeEntity } from './entities/anime.entity';
import { AquilaFlags } from '@runa/permissions';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CacheService } from '../../providers/cache/cache.service';
import { rrTooManyRequestsException } from 'src/providers/error';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('anime')
@UseGuards(AuthGuard, PermissionsGuard)
export class AnimeController {
  constructor(
    private readonly animeService: AnimeService,
    private readonly cacheService: CacheService,
  ) {}

  private readonly moduleCode: string = 'AeCtr-';

  @Public()
  @Get('search')
  async search(@Query() query: { name: string }): Promise<AnimeSearchEntity> {
    return this.animeService.search(query.name);
  }

  @Public()
  @Get('details/:id')
  async getAnime(@Param('id') id: string): Promise<AnimeEntity> {
    return this.animeService.getAnime(parseInt(id));
  }

  @Post('refresh/:id')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshAnime(@Param('id') id: string): Promise<AnimeEntity> {
    const cooldownKey = `cooldown:refresh:anime:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
        message: 'This media was refreshed recently.',
      });
    }

    const result = await this.animeService.getAnime(parseInt(id), true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
