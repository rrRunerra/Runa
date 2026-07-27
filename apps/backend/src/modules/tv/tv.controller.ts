import { Controller, Param, UseGuards, Get, Post, Query } from '@nestjs/common';
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
  @Get(':id/similar')
  async getSimilar(@Param() params: TvDetailDto | any): Promise<any[]> {
    const id = typeof params === 'object' && params !== null && 'id' in params ? params.id : params;
    return await this.tvService.getSimilarTv(Number(id));
  }

  @Public()
  @Get(':id')
  async getTv(
    @Param() params: TvDetailDto | any,
  ): Promise<TvEntity | undefined> {
    const id = typeof params === 'object' && params !== null && 'id' in params ? params.id : params;
    return await this.tvService.getTv(id);
  }



  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshTv(
    @Param() params: TvRefreshDto,
    @Query('force') forceQuery?: string,
  ): Promise<TvEntity | undefined | null> {
    const force = forceQuery === 'true' || forceQuery === '1';
    return await this.tvService.refreshTv(
      params.id,
      ...(forceQuery !== undefined ? [force] : []),
    );
  }
}
