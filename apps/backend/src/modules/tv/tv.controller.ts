import { Controller, Param, UseGuards, Get, Query, Post, Req, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { TvService } from './tv.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { SearchTvDto } from './dto/search-tv.dto';
import { TvSearchEntity } from './entities/tv-search.entity';
import { TvEntity } from './entities/tv.entity';
import { AquilaBitField } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';

@Controller('tv')
@UseGuards(DualAuthGuard)
export class TvController {
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
  public async refreshTv(@Param('id') id: string, @Req() req: any): Promise<TvEntity> {
    const bitfield = AquilaBitField.fromRaw(req.user.permissions);
    if (!bitfield.has('MEDIA_REFRESH')) {
      throw new ForbiddenException('You do not have permission to refresh media');
    }

    const cooldownKey = `cooldown:refresh:tv:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new HttpException(
        'This media was refreshed recently. Please wait before refreshing again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.tvService.getTv(id, true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
