import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { DiscoverService } from './discover.service';
import { DiscoverQueryDto, CalendarQueryDto } from './discover.dto';
import { DiscoverResponse, DiscoverMetaResponse, CalendarItemEntity } from './discover.entity';

@Controller('discover')
@UseGuards(AuthGuard)
export class DiscoverController {
  private readonly moduleCode = 'DrCtr-';

  constructor(private readonly discoverService: DiscoverService) {}

  @Public()
  @Get('meta/:type')
  async getMetadata(
    @Param('type') type: string,
  ): Promise<DiscoverMetaResponse> {
    return this.discoverService.getMetadata(type);
  }

  @Public()
  @Get('calendar')
  async getCalendar(
    @Query() query: CalendarQueryDto,
    @Req() req?: any,
  ): Promise<CalendarItemEntity[]> {
    return this.discoverService.getCalendar(query, req?.user?.username);
  }

  @Public()
  @Get(':type')
  async discover(
    @Param('type') type: string,
    @Query() query: DiscoverQueryDto,
  ): Promise<DiscoverResponse> {
    return this.discoverService.discover(type, query);
  }
}

