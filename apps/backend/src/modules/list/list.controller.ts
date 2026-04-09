import {
  Controller,
  Param,
  UseGuards,
  Get,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { ListService } from './list.service';
import ListEntity from './entities/ListEntity';
import { $Enums } from '@runa/database';

@Controller('list')
@UseGuards(DualAuthGuard)
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Public()
  @Get('/anime/:userId')
  public async getAnimeList(
    @Param('userId') userId: string,
  ): Promise<ListEntity[]> {
    return this.listService.getAnimeList(userId);
  }

  @Post('/anime/upsert')
  public async upsertAnimeList(
    @Body()
    body: {
      userId: string;
      animeId: number;
      status?: $Enums.AnimeListStatus;
      progress?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertAnimeList(body);
  }
}
