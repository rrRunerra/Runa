import { Controller, Param, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedQuery } from '@nestia/core';
import { TvService } from './tv.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { SearchTvDto } from './dto/search-tv.dto';
import { TvSearchEntity } from './entities/tv-search.entity';
import { TvEntity } from './entities/tv.entity';

@Controller('tv')
@UseGuards(DualAuthGuard)
export class TvController {
  constructor(private readonly tvService: TvService) {}

  @Public()
  @TypedRoute.Get('search')
  public async search(
    @TypedQuery() query: SearchTvDto,
  ): Promise<TvSearchEntity> {
    return this.tvService.search(query.name);
  }

  @Public()
  @TypedRoute.Get(':id')
  public async getTv(@Param('id') id: string): Promise<TvEntity> {
    return this.tvService.getTv(id);
  }
}
