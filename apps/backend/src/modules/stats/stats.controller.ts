import { Controller, Param, UseGuards, Get, Req } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { GetStatsDto } from './stats.dto';
import { StatsService } from './stats.service';
import type { StatsEntity } from './stats.entities';
import type { ExtendedRequest } from 'src/common/guards/auth/auth.types';

@Controller('stats')
@UseGuards(AuthGuard)
export class StatsController {
  private readonly moduleCode = 'StCtr-';

  constructor(private readonly statsService: StatsService) {}

  @Public()
  @Get('/:username/:type')
  public async getStats(
    @Param() params: GetStatsDto,
    @Req() req: ExtendedRequest,
  ): Promise<StatsEntity> {
    return this.statsService.getStats(
      params.username.toLowerCase(),
      params.type.toLowerCase(),
      req,
    );
  }
}
