import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { RankingsParamDto, RankingsQueryDto } from './rankings.dto';
import {
  RankingsMetaResponse,
  RankingsResponse,
} from './rankings.entities';
import { RankingsService } from './rankings.service';

@Controller('rankings')
@UseGuards(AuthGuard)
export class RankingsController {
  private readonly moduleCode = 'RaCtr-';

  constructor(private readonly rankingsService: RankingsService) {}

  @Public()
  @Get('meta/:type')
  async getMetadata(
    @Param() param: RankingsParamDto,
  ): Promise<RankingsMetaResponse> {
    return this.rankingsService.getMetadata(param.type);
  }

  @Public()
  @Get(':type')
  async getRankings(
    @Param() param: RankingsParamDto,
    @Query() query: RankingsQueryDto,
  ): Promise<RankingsResponse> {
    return this.rankingsService.getRankings(param.type, query);
  }
}
