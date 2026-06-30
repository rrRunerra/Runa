import { Controller, Param, UseGuards, Get, Query, Post } from '@nestjs/common';
import { TvService } from './tv.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { SearchTvDto } from './dto/search-tv.dto';
import { TvSearchEntity } from './entities/tv-search.entity';
import { TvEntity } from './entities/tv.entity';
import { AquilaFlags } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';
import { rrTooManyRequestsException } from 'src/providers/error';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('tv')
@UseGuards(AuthGuard, PermissionsGuard)
export class TvController {
  private readonly moduleCode = 'TvCtr-';

  constructor(
    private readonly tvService: TvService,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get('search')
  public async search(@Query() query: SearchTvDto): Promise<TvSearchEntity> {
    return this.tvService.search(query.name);
  }

  @Public()
  @Get('details/:id')
  public async getTv(@Param('id') id: string): Promise<TvEntity> {
    return this.tvService.getTv(id);
  }

  @Post('refresh/:id')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  public async refreshTv(@Param('id') id: string): Promise<TvEntity> {
    const cooldownKey = `cooldown:refresh:tv:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRRPWBRA001`, {
        message:
          'This media was refreshed recently. Please wait before refreshing again.',
      });
    }

    const result = await this.tvService.getTv(id, true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
