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
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { ListService } from './list.service';
import ListEntity from './list.entities';
import { $Enums } from '@runa/database';

@Controller('list')
@UseGuards(AuthGuard)
export class ListController {
  constructor(private readonly listService: ListService) {}

  // ─────────────────────────── ANIME ───────────────────────────

  @Public()
  @Get('/anime/user/:username')
  public async getAnimeList(
    @Param('username') username: string,
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('format') format?: string,
    @Query('sort') sort?: string,
    @Query('genres') genres?: string,
    @Query('year') year?: string,
    @Query('mediaStatus') mediaStatus?: string,
  ): Promise<any> {
    return this.listService.getAnimeList(username, req.user?.username, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
      search,
      format,
      sort,
      genres,
      year,
      mediaStatus,
    });
  }

  @Get('/anime/entry/:animeId')
  public async getAnimeListEntry(
    @Param('animeId') animeId: string,
    @Req() req: any,
  ): Promise<any> {
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
        anilist?: any;
        mal?: any;
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
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('format') format?: string,
    @Query('sort') sort?: string,
    @Query('genres') genres?: string,
    @Query('year') year?: string,
    @Query('mediaStatus') mediaStatus?: string,
  ): Promise<any> {
    return this.listService.getMangaList(username, req.user?.username, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
      search,
      format,
      sort,
      genres,
      year,
      mediaStatus,
    });
  }

  @Get('/manga/entry/:mangaId')
  public async getMangaListEntry(
    @Param('mangaId') mangaId: string,
    @Req() req: any,
  ): Promise<any> {
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
        anilist?: any;
        mal?: any;
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
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('format') format?: string,
    @Query('sort') sort?: string,
    @Query('genres') genres?: string,
    @Query('year') year?: string,
    @Query('mediaStatus') mediaStatus?: string,
  ): Promise<any> {
    return this.listService.getMovieList(username, req.user?.username, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
      search,
      format,
      sort,
      genres,
      year,
      mediaStatus,
    });
  }

  @Get('/movie/entry/:movieId')
  public async getMovieListEntry(
    @Param('movieId') movieId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getMovieListEntry(
      req.user.username,
      Number(movieId),
    );
  }

  @Post('/movie/entry/save')
  public async saveMovieListEntry(
    @Req() req: any,
    @Body()
    body: {
      movieId: number;
      status?: $Enums.MovieListStatus;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      updateConnection?: boolean;
      connections?: any;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertMovieList(req.user.username, body);
  }

  @Delete('/movie/entry/:movieId')
  public async deleteMovieListEntry(
    @Param('movieId') movieId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteMovieList(req.user.username, Number(movieId));
  }

  // ─────────────────────────── TV ───────────────────────────

  @Public()
  @Get('/tv/user/:username')
  public async getTvList(
    @Param('username') username: string,
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('format') format?: string,
    @Query('sort') sort?: string,
    @Query('genres') genres?: string,
    @Query('year') year?: string,
    @Query('mediaStatus') mediaStatus?: string,
  ): Promise<any> {
    return this.listService.getTvList(username, req.user?.username, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
      search,
      format,
      sort,
      genres,
      year,
      mediaStatus,
    });
  }

  @Get('/tv/entry/:tvId')
  public async getTvListEntry(
    @Param('tvId') tvId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getTvListEntry(req.user.username, Number(tvId));
  }

  @Post('/tv/entry/save')
  public async saveTvListEntry(
    @Req() req: any,
    @Body()
    body: {
      tvId: number;
      status?: $Enums.TvListStatus;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      updateConnection?: boolean;
      connections?: any;
      episodes?: { seasonNum: number; episodeNum: number }[];
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertTvList(req.user.username, body);
  }

  @Delete('/tv/entry/:tvId')
  public async deleteTvListEntry(
    @Param('tvId') tvId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteTvList(req.user.username, Number(tvId));
  }

  // ─────────────────────────── GAME ───────────────────────────

  @Public()
  @Get('/game/user/:username')
  public async getGameList(
    @Param('username') username: string,
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('format') format?: string,
    @Query('sort') sort?: string,
    @Query('genres') genres?: string,
    @Query('year') year?: string,
    @Query('mediaStatus') mediaStatus?: string,
  ): Promise<any> {
    return this.listService.getGameList(username, req.user?.username, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
      search,
      format,
      sort,
      genres,
      year,
      mediaStatus,
    });
  }

  @Get('/game/entry/:gameId')
  public async getGameListEntry(
    @Param('gameId') gameId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getGameListEntry(req.user.username, Number(gameId));
  }

  @Post('/game/entry/save')
  public async saveGameListEntry(
    @Req() req: any,
    @Body()
    body: {
      gameId: number;
      status?: $Enums.GameListStatus;
      progress?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertGameList(req.user.username, body);
  }

  @Delete('/game/entry/:gameId')
  public async deleteGameListEntry(
    @Param('gameId') gameId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteGameList(req.user.username, Number(gameId));
  }

  // ─────────────────────────── BOOK ───────────────────────────

  @Public()
  @Get('/book/user/:username')
  public async getBookList(
    @Param('username') username: string,
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('format') format?: string,
    @Query('sort') sort?: string,
    @Query('genres') genres?: string,
    @Query('year') year?: string,
    @Query('mediaStatus') mediaStatus?: string,
  ): Promise<any> {
    return this.listService.getBookList(username, req.user?.username, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
      search,
      format,
      sort,
      genres,
      year,
      mediaStatus,
    });
  }

  @Get('/book/entry/:bookId')
  public async getBookListEntry(
    @Param('bookId') bookId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.listService.getBookListEntry(req.user.username, bookId);
  }

  @Post('/book/entry/save')
  public async saveBookListEntry(
    @Req() req: any,
    @Body()
    body: {
      bookId: string;
      status?: $Enums.BookListStatus;
      chapters?: number;
      volumes?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.upsertBookList(req.user.username, body);
  }

  @Delete('/book/entry/:bookId')
  public async deleteBookListEntry(
    @Param('bookId') bookId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    return this.listService.deleteBookList(req.user.username, bookId);
  }

  @Get('/watching')
  public async getWatchingList(@Req() req: any): Promise<any> {
    return this.listService.getWatchingList(req.user.username);
  }

  @Post('/increment')
  public async incrementProgress(
    @Req() req: any,
    @Body()
    body: {
      mediaType: 'anime' | 'manga' | 'tv' | 'game' | 'book';
      id: number | string;
      count?: number;
    },
  ): Promise<any> {
    return this.listService.incrementProgress(
      req.user.username,
      body.mediaType,
      body.id,
      body.count,
    );
  }

  @Post('/tv/entry/:tvId/episode')
  public async toggleEpisode(
    @Param('tvId') tvId: string,
    @Req() req: any,
    @Body() body: { seasonNum: number; episodeNum: number },
  ): Promise<any> {
    return this.listService.toggleEpisodeWatched(
      req.user.username,
      Number(tvId),
      body.seasonNum,
      body.episodeNum,
    );
  }

  @Post('/tv/entry/:tvId/season')
  public async toggleSeason(
    @Param('tvId') tvId: string,
    @Req() req: any,
    @Body() body: { seasonNum: number; episodes: any[]; watched: boolean },
  ): Promise<any> {
    return this.listService.toggleSeasonWatched(
      req.user.username,
      Number(tvId),
      body.seasonNum,
      body.episodes,
      body.watched,
    );
  }

  @Public()
  @Get('/:mediaType/user/:username/filters')
  public async getUserListFilters(
    @Param('mediaType') mediaType: string,
    @Param('username') username: string,
  ): Promise<any> {
    return this.listService.getUserListFilters(username, mediaType);
  }

  // ─────────────────────────── RADARR/SONARR ───────────────────────────

  @Get('*api/v3/movie')
  public async getRadarrMovieList(@Req() req: any): Promise<any[]> {
    return this.listService.getRadarrMovieList(req.user.username);
  }

  @Get('sonarr/tv/api/v3/series')
  public async getSonarrTvList(@Req() req: any): Promise<any[]> {
    return this.listService.fetchSonarrSeries(req.user.username, true, false);
  }

  @Get('sonarr/anime/api/v3/series')
  public async getSonarrAnimeList(@Req() req: any): Promise<any[]> {
    return this.listService.fetchSonarrSeries(req.user.username, false, true);
  }

  @Get('*api/v3/series')
  public async getSonarrSeriesListCombined(@Req() req: any): Promise<any[]> {
    return this.listService.fetchSonarrSeries(req.user.username, true, true);
  }

  @Get('*api/v3/qualityprofile')
  public getQualityProfiles(): any[] {
    return [
      {
        id: 1,
        name: 'Any',
      },
    ];
  }

  @Get('/export/rrlist')
  public async exportRrList(
    @Req() req: any,
    @Query('types') types: string,
  ): Promise<any> {
    const listTypes = types ? types.split(',') : [];
    return this.listService.exportRrList(req.user.username, listTypes);
  }

  @Get('/export/mal')
  public async exportMalXml(
    @Req() req: any,
    @Query('type') type: 'anime' | 'manga',
  ): Promise<string> {
    return this.listService.exportMalXml(req.user.username, type);
  }

  @Post('/import/rrlist')
  public async importRrList(
    @Req() req: any,
    @Body() body: any,
  ): Promise<{ success: boolean; message: string }> {
    return this.listService.startImport(req.user.username, body);
  }
}
