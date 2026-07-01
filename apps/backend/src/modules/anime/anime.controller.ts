import { Controller, Param, UseGuards, Get, Post } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import type { AnimeSearchEntity, AnimeEntity } from './anime.entities';
import { AquilaFlags } from '@runa/permissions';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CacheService } from '../../providers/cache/cache.service';
import { rrTooManyRequestsException } from 'src/providers/error';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { AnimeDetailDto, SearchAnimeDto } from './anime.dto';

@Controller('anime')
@UseGuards(AuthGuard, PermissionsGuard)
export class AnimeController {
  constructor(
    private readonly animeService: AnimeService,
    private readonly cacheService: CacheService,
  ) {}

  private readonly moduleCode: string = 'AeCtr-';

  @Public()
  @Get('search/:name')
  async search(@Param() params: SearchAnimeDto): Promise<AnimeSearchEntity[]> {
    return this.animeService.search(params.name);
  }

  @Public()
  @Get(':id')
  async animeDetail(
    @Param('id') params: AnimeDetailDto,
  ): Promise<AnimeEntity | null> {
    return await this.animeService.getAnime(params.id);
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
