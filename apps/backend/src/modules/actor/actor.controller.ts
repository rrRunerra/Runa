import { Controller, Param, UseGuards, Get } from '@nestjs/common';
import { ActorService } from './actor.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { ActorDetailDto } from './actor.dto';
import { ActorDetailEntity } from './actor.entities';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('actor')
@UseGuards(AuthGuard, PermissionsGuard)
export class ActorController {
  constructor(private readonly actorService: ActorService) {}

  @Public()
  @Get(':id')
  async getActor(
    @Param() params: ActorDetailDto,
  ): Promise<ActorDetailEntity> {
    return this.actorService.getActor(params.id);
  }

  @Public()
  @Get('staff/:id')
  async getStaff(
    @Param() params: ActorDetailDto,
  ): Promise<ActorDetailEntity> {
    return this.actorService.getActor(params.id);
  }

  @Public()
  @Get('search/:query')
  async searchActor(
    @Param('query') query: string,
  ): Promise<any[]> {
    return this.actorService.search(query);
  }
}
