import { Controller, Param, UseGuards, Get, Post } from '@nestjs/common';
import { TvService } from './tv.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import type { TvSearchEntity, TvEntity } from './tv.entities';
import { AquilaFlags } from '@runa/permissions';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { SearchTvDto, TvDetailDto, TvRefreshDto } from './tv.dto';

@Controller('tv')
@UseGuards(AuthGuard, PermissionsGuard)
export class TvController {
  constructor(private readonly tvService: TvService) {}

  private readonly moduleCode = 'TvCtr-';

  @Public()
  @Get('search/:name')
  async search(@Param() params: SearchTvDto): Promise<TvSearchEntity[]> {
    return this.tvService.search(params.name);
  }

  @Public()
  @Get(':id')
  async tvDetail(@Param() params: TvDetailDto): Promise<TvEntity | undefined> {
    return await this.tvService.getTv(params.id);
  }

  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshTv(
    @Param() params: TvRefreshDto,
  ): Promise<TvEntity | undefined | null> {
    return await this.tvService.refreshTv(params.id);
  }
}
