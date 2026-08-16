import { Controller, Param, UseGuards, Get } from '@nestjs/common';
import { StudioService } from './studio.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { StudioDetailDto } from './studio.dto';
import { StudioDetailEntity, StudioSearchEntity } from './studio.entities';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('studio')
@UseGuards(AuthGuard, PermissionsGuard)
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Public()
  @Get(':id')
  async getStudio(
    @Param() params: StudioDetailDto,
  ): Promise<StudioDetailEntity> {
    return this.studioService.getStudio(params.id);
  }

  @Public()
  @Get('search/:query')
  async searchStudio(
    @Param('query') query: string,
  ): Promise<StudioSearchEntity[]> {
    return this.studioService.search(query);
  }
}
