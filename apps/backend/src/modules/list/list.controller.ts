import {
  Controller,
  Param,
  UseGuards,
  Get,
  Query,
  Post,
  Body,
  Delete,
  Req,
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

  // ─────────────────────────── ANIME ───────────────────────────

  @Public()
  @Get('/anime/user/:username')
  public async getAnimeList(
    @Param('username') username: string,
  ): Promise<ListEntity[]> {
    return this.listService.getAnimeList(username);
  }

  @Get('/anime/entry/:animeId')
  public async getAnimeListEntry(
    @Param('animeId') animeId: string,
    @Req() req: any,
  ) {
    return this.listService.getAnimeListEntry(
      req.user.username,
      Number(animeId),
    );
  }

  @Post('/anime/entry/save')
  public async saveAnimeListEntry(
    @Req() req: any,
    @Body()
    body: {
      animeId: number;
      status?: $Enums.AnimeListStatus;
      progress?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      updateConnection?: boolean;
      connections?: {
        anilist?: number;
        mal?: number;
      };
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertAnimeList(req.user.username, body);
  }

  @Delete('/anime/entry/:animeId')
  public async deleteAnimeListEntry(
    @Param('animeId') animeId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteAnimeList(req.user.username, Number(animeId));
  }

  // ─────────────────────────── MANGA ───────────────────────────

  @Public()
  @Get('/manga/user/:username')
  public async getMangaList(
    @Param('username') username: string,
  ): Promise<ListEntity[]> {
    return this.listService.getMangaList(username);
  }

  @Get('/manga/entry/:mangaId')
  public async getMangaListEntry(
    @Param('mangaId') mangaId: string,
    @Req() req: any,
  ) {
    return this.listService.getMangaListEntry(
      req.user.username,
      Number(mangaId),
    );
  }

  @Post('/manga/entry/save')
  public async saveMangaListEntry(
    @Req() req: any,
    @Body()
    body: {
      mangaId: number;
      status?: $Enums.MangaListStatus;
      chapters?: number;
      volumes?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      reread?: number;
      updateConnection?: boolean;
      connections?: {
        anilist?: number;
        mal?: number;
      };
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertMangaList(req.user.username, body);
  }

  @Delete('/manga/entry/:mangaId')
  public async deleteMangaListEntry(
    @Param('mangaId') mangaId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteMangaList(req.user.username, Number(mangaId));
  }

  // ─────────────────────────── MOVIE ───────────────────────────

  @Public()
  @Get('/movie/user/:username')
  public async getMovieList(
    @Param('username') username: string,
  ): Promise<ListEntity[]> {
    return this.listService.getMovieList(username);
  }

  @Get('/movie/entry/:tvdbId')
  public async getMovieListEntry(
    @Param('tvdbId') tvdbId: string,
    @Req() req: any,
  ) {
    return this.listService.getMovieListEntry(
      req.user.username,
      Number(tvdbId),
    );
  }

  @Post('/movie/entry/save')
  public async saveMovieListEntry(
    @Req() req: any,
    @Body()
    body: {
      tvdbId: number;
      status?: $Enums.MovieListStatus;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      connections?: any;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertMovieList(req.user.username, body);
  }

  @Delete('/movie/entry/:tvdbId')
  public async deleteMovieListEntry(
    @Param('tvdbId') tvdbId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteMovieList(req.user.username, Number(tvdbId));
  }

  // ─────────────────────────── TV ───────────────────────────

  @Public()
  @Get('/tv/user/:username')
  public async getTvList(
    @Param('username') username: string,
  ): Promise<ListEntity[]> {
    return this.listService.getTvList(username);
  }

  @Get('/tv/entry/:tvdbId')
  public async getTvListEntry(@Param('tvdbId') tvdbId: string, @Req() req: any) {
    return this.listService.getTvListEntry(req.user.username, Number(tvdbId));
  }

  @Post('/tv/entry/save')
  public async saveTvListEntry(
    @Req() req: any,
    @Body()
    body: {
      tvdbId: number;
      status?: $Enums.TvListStatus;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      connections?: any;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertTvList(req.user.username, body);
  }

  @Delete('/tv/entry/:tvdbId')
  public async deleteTvListEntry(
    @Param('tvdbId') tvdbId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteTvList(req.user.username, Number(tvdbId));
  }

  @Get('/watching')
  public async getWatchingList(@Req() req: any) {
    return this.listService.getWatchingList(req.user.username);
  }

  @Post('/increment')
  public async incrementProgress(
    @Req() req: any,
    @Body() body: { mediaType: 'anime' | 'manga' | 'tv'; id: number },
  ) {
    return this.listService.incrementProgress(
      req.user.username,
      body.mediaType,
      body.id,
    );
  }

  @Post('/tv/entry/:tvdbId/episode')
  public async toggleEpisode(
    @Param('tvdbId') tvdbId: string,
    @Req() req: any,
    @Body() body: { seasonNum: number; episodeNum: number },
  ) {
    return this.listService.toggleEpisodeWatched(
      req.user.username,
      Number(tvdbId),
      body.seasonNum,
      body.episodeNum,
    );
  }

  @Post('/tv/entry/:tvdbId/season')
  public async toggleSeason(
    @Param('tvdbId') tvdbId: string,
    @Req() req: any,
    @Body() body: { seasonNum: number; episodes: any[]; watched: boolean },
  ) {
    return this.listService.toggleSeasonWatched(
      req.user.username,
      Number(tvdbId),
      body.seasonNum,
      body.episodes,
      body.watched,
    );
  }
}
