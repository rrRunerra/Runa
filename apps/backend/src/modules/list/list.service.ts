// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import {
  rrForbiddenException,
  rrInternalServerErrorException,
  rrNotFoundException,
} from 'src/providers/error';

import { parsePrivacy } from '../user/user.service';

import { $Enums } from '@runa/database';
import { MovieUpdateData, TvUpdateData } from '@runa/connections';

import { PrismaService } from '../../providers/database/prisma.service';
import { StatsService } from '../stats/stats.service';
import { ListExternal } from './list.external';
import ListEntity from './list.entities';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';
import { GameService } from '../game/game.service';
import { BookService } from '../book/book.service';
import { NotificationService } from '../notification/notification.service';
import { MediaStatsService } from './media-stats.service';

export interface ListQueryOptions {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  format?: string;
  sort?: string;
  genres?: string;
  year?: string;
  mediaStatus?: string;
}

// Simple in-memory cache for Fribb's AniList -> TVDB mapping
class AnimeMappingCache {
  private static mappings: Map<number, number> | null = null;
  private static lastFetched = 0;
  private static isFetching = false;

  public static async getTvdbId(anilistId: number): Promise<number | null> {
    const now = Date.now();
    if (
      (!this.mappings || now - this.lastFetched > 24 * 60 * 60 * 1000) &&
      !this.isFetching
    ) {
      this.isFetching = true;
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json',
        );
        const list = await res.json();
        const newMap = new Map<number, number>();
        for (const item of list) {
          if (item.anilist_id && item.tvdb_id) {
            newMap.set(item.anilist_id, item.tvdb_id);
          }
        }
        this.mappings = newMap;
        this.lastFetched = now;
      } catch (err) {
        console.error('Failed to fetch anime mapping from Fribb:', err);
      } finally {
        this.isFetching = false;
      }
    }
    return this.mappings?.get(anilistId) || null;
  }
}

@Injectable()
export class ListService {
  private readonly moduleCode = 'LeSve-';

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionsManager: ListExternal,
    private readonly statsService: StatsService,
    private readonly movieService: MovieService,
    private readonly tvService: TvService,
    private readonly animeService: AnimeService,
    private readonly mangaService: MangaService,
    private readonly gameService: GameService,
    private readonly bookService: BookService,
    private readonly notificationService: NotificationService,
    private readonly mediaStatsService: MediaStatsService,
  ) {}

  private readonly logger = new Logger(ListService.name);

  private async getUserId(username: string): Promise<string> {
    const user = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!user)
      throw new rrNotFoundException(`${this.moduleCode}UNF001`, {
        message: `User ${username} not found`,
      });
    return user.id;
  }

  private getPrismaStatus<T>(
    status: string | undefined,
    enumObj: any,
  ): T | undefined {
    if (!status || status.toLowerCase() === 'all') return undefined;
    let normalized = status.toUpperCase().trim();
    if (normalized.endsWith('TV') && normalized.length > 2) {
      const charBeforeTV = normalized.charAt(normalized.length - 3);
      if (
        charBeforeTV === ' ' ||
        charBeforeTV === '\t' ||
        charBeforeTV === '\r' ||
        charBeforeTV === '\n'
      ) {
        normalized = normalized.slice(0, -2).trim();
      }
    }
    normalized = normalized.replace(/\s+/g, '_');
    if (Object.values(enumObj).includes(normalized)) {
      return normalized as unknown as T;
    }
    return undefined;
  }

  private async getStatusCounts(
    table: any,
    username: string,
  ): Promise<Record<string, number>> {
    const countGroups = await table.groupBy({
      by: ['status'],
      where: { username: username.toLowerCase() },
      _count: { status: true },
    });

    const counts: Record<string, number> = { all: 0 };
    let total = 0;
    for (const group of countGroups) {
      const statusKey = group.status.toLowerCase();
      counts[statusKey] = group._count.status;
      total += group._count.status;
    }
    counts['all'] = total;
    return counts;
  }

  private getAnimeOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { anime: { titleEnglish: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'progress':
        return { progress: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getMangaOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { manga: { titleEnglish: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'progress':
        return { chapters: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getMovieOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { movie: { titleEnglish: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getTvOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { tv: { titleEnglish: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getGameOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { game: { titleString: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'progress':
        return { progress: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  private getBookOrderBy(sort: string | undefined): any {
    switch (sort) {
      case 'title':
        return { book: { titleString: 'asc' } };
      case 'score':
        return { score: 'desc' };
      case 'progress':
        return { chapters: 'desc' };
      case 'last_added':
        return { createdAt: 'desc' };
      case 'last_updated':
      default:
        return { updatedAt: 'desc' };
    }
  }

  public async getAnimeList(
    username: string,
    requester?: string,
    query?: ListQueryOptions,
  ): Promise<{ entries: ListEntity[]; counts: Record<string, number> }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new rrNotFoundException(`${this.moduleCode}UNF002`, {
        message: `User ${username} not found`,
      });
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.animeList) && !isOwner) {
      throw new rrForbiddenException(`${this.moduleCode}TLIP001`, {
        message: 'This list is private',
      });
    }

    const statusEnum = this.getPrismaStatus<$Enums.AnimeListStatus>(
      query?.status,
      $Enums.AnimeListStatus,
    );
    const search = query?.search?.trim();
    const format = query?.format?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (format || search || genres || year || mediaStatus) {
      whereClause.anime = {};
      if (format) {
        whereClause.anime.format = format;
      }
      if (search) {
        whereClause.anime.OR = [
          { titleEnglish: { contains: search, mode: 'insensitive' } },
          { titleRomaji: { contains: search, mode: 'insensitive' } },
          { titleNative: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.anime.genres = { hasEvery: genreList };
      }
      if (year) {
        whereClause.anime.startDateYear = Number(year);
      }
      if (mediaStatus) {
        whereClause.anime.status = mediaStatus;
      }
    }

    const [list, counts] = await Promise.all([
      this.prisma.client.aquilaAnimeUserList.findMany({
        where: whereClause,
        take: query?.limit ?? 30,
        skip: query?.offset ?? 0,
        orderBy: this.getAnimeOrderBy(query?.sort),
        select: {
          animeId: true,
          status: true,
          progress: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          anime: {
            select: {
              titleEnglish: true,
              titleRomaji: true,
              titleNative: true,
              coverImageLarge: true,
              episodes: true,
              format: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaAnimeUserList, username),
    ]);

    const mappedList: ListEntity[] = list.map((item) => {
      return {
        id: item.animeId,
        title:
          item.anime.titleEnglish ??
          item.anime.titleRomaji ??
          item.anime.titleNative ??
          '',
        score: item.score,
        progress: item.progress,
        episodes: item.anime.episodes,
        image: item.anime.coverImageLarge ?? '',
        format: item.anime.format,
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'anime',
        mediaStatus: item.anime.status,
      };
    });

    return { entries: mappedList, counts };
  }

  public async getAnimeListEntry(username: string, animeId: number) {
    const out = await this.prisma.client.aquilaAnimeUserList.findUnique({
      where: {
        username_animeId: {
          username: username.toLowerCase(),
          animeId,
        },
      },
    });

    if (!out)
      throw new rrNotFoundException(`${this.moduleCode}ANFIL001`, {
        message: 'Anime not found in list',
      });
    return out;
  }

  public async upsertAnimeList(
    username: string,
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
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.animeList);

      const oldEntry = await this.prisma.client.aquilaAnimeUserList.findUnique({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId: body.animeId,
          },
        },
      });

      await this.prisma.client.aquilaAnimeUserList.upsert({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId: body.animeId,
          },
        },
        update: {
          status: body.status,
          progress: body.progress,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          animeId: body.animeId,
          status: body.status,
          progress: body.progress,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
          private: isPrivate,
        },
      });

      if (body.updateConnection) {
        await this.updateConnections(
          username.toLowerCase(),
          body.animeId,
          body.connections || {},
          body.status,
          body.progress,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.rewatched,
        );
      }

      const newEntry = await this.prisma.client.aquilaAnimeUserList.findUnique({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId: body.animeId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('anime', body.animeId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update anime list',
        error: error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'anime');

    return {
      success: true,
      message: 'Anime list updated successfully',
    };
  }

  public async deleteAnimeList(
    username: string,
    animeId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaAnimeUserList.findUnique({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
      });

      await this.prisma.client.aquilaAnimeUserList.delete({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('anime', animeId, entry, null);

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections)) {
          const conn = entry.connections[providerKey];
          if (!conn) continue;
          const providerId =
            typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteAnime(providerKey, username.toLowerCase(), providerId)
              .catch((err) =>
                this.logger.error(
                  `Failed to delete anime connection for provider ${providerKey}`,
                  err,
                ),
              );
          }
        }
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'anime');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete anime from list',
        error: error,
      };
    }
  }

  private async updateConnections(
    username: string,
    animeId: number,
    connections: any,
    status?: string,
    progress?: number,
    score?: number,
    startDate?: number,
    endDate?: number,
    notes?: string,
    rewatched?: number,
  ) {
    if (!connections || typeof connections !== 'object') return;

    for (const providerKey of Object.keys(connections)) {
      const conn = connections[providerKey];
      if (!conn) continue;

      let providerId: number;
      let connStatus = status;
      let connProgress = progress;
      let connScore = score;
      let connStartDate = startDate;
      let connEndDate = endDate;
      let connNotes = notes;
      let connRewatched = rewatched;

      if (typeof conn === 'object' && conn !== null) {
        providerId = Number(conn.id);
        if (conn.status !== undefined) connStatus = conn.status;
        if (conn.progressOffset !== undefined) {
          connProgress = (progress || 0) + Number(conn.progressOffset);
        } else if (conn.progress !== undefined) {
          connProgress = Number(conn.progress);
        }
        if (conn.score !== undefined) connScore = Number(conn.score);
        if (conn.startDate !== undefined) connStartDate = conn.startDate;
        if (conn.endDate !== undefined) connEndDate = conn.endDate;
        if (conn.notes !== undefined) connNotes = conn.notes;
        if (conn.rewatched !== undefined)
          connRewatched = Number(conn.rewatched);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      await this.connectionsManager
        .syncAnime(providerKey, username, providerId, {
          status: connStatus,
          progress: connProgress,
          score: connScore,
          startDate: connStartDate,
          endDate: connEndDate,
          notes: connNotes,
          rewatched: connRewatched,
        })
        .catch((err) =>
          this.logger.error(`Failed to sync anime with ${providerKey}`, err),
        );
    }
  }

  public async getMangaList(
    username: string,
    requester?: string,
    query?: ListQueryOptions,
  ): Promise<{ entries: ListEntity[]; counts: Record<string, number> }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new rrNotFoundException(`${this.moduleCode}UNF003`, {
        message: `User ${username} not found`,
      });
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.mangaList) && !isOwner) {
      throw new rrForbiddenException(`${this.moduleCode}TLIP002`, {
        message: 'This list is private',
      });
    }

    const statusEnum = this.getPrismaStatus<$Enums.MangaListStatus>(
      query?.status,
      $Enums.MangaListStatus,
    );
    const search = query?.search?.trim();
    const format = query?.format?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (format || search || genres || year || mediaStatus) {
      whereClause.manga = {};
      if (format) {
        whereClause.manga.format = format;
      }
      if (search) {
        whereClause.manga.OR = [
          { titleEnglish: { contains: search, mode: 'insensitive' } },
          { titleRomaji: { contains: search, mode: 'insensitive' } },
          { titleNative: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.manga.genres = { hasEvery: genreList };
      }
      if (year) {
        whereClause.manga.startDateYear = Number(year);
      }
      if (mediaStatus) {
        whereClause.manga.status = mediaStatus;
      }
    }

    const [list, counts] = await Promise.all([
      this.prisma.client.aquilaMangaUserList.findMany({
        where: whereClause,
        take: query?.limit ?? 30,
        skip: query?.offset ?? 0,
        orderBy: this.getMangaOrderBy(query?.sort),
        select: {
          mangaId: true,
          status: true,
          chapters: true,
          volumes: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          manga: {
            select: {
              titleEnglish: true,
              titleRomaji: true,
              titleNative: true,
              coverImageLarge: true,
              chapters: true,
              format: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaMangaUserList, username),
    ]);

    const mappedList: ListEntity[] = list.map((item) => ({
      id: item.mangaId,
      title:
        item.manga.titleEnglish ??
        item.manga.titleRomaji ??
        item.manga.titleNative ??
        '',
      score: item.score,
      progress: item.chapters,
      episodes: item.manga.chapters,
      image: item.manga.coverImageLarge ?? '',
      format: item.manga.format,
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'manga',
      mediaStatus: item.manga.status,
    }));

    return { entries: mappedList, counts };
  }

  public async getMangaListEntry(username: string, mangaId: number) {
    const out = await this.prisma.client.aquilaMangaUserList.findUnique({
      where: {
        username_mangaId: {
          username: username.toLowerCase(),
          mangaId,
        },
      },
    });

    if (!out)
      throw new rrNotFoundException(`${this.moduleCode}MNFIL001`, {
        message: 'Manga not found in list',
      });
    return out;
  }

  public async upsertMangaList(
    username: string,
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
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.mangaList);

      const oldEntry = await this.prisma.client.aquilaMangaUserList.findUnique({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId: body.mangaId,
          },
        },
      });

      await this.prisma.client.aquilaMangaUserList.upsert({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId: body.mangaId,
          },
        },
        update: {
          status: body.status,
          chapters: body.chapters,
          volumes: body.volumes,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          reread: body.reread,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          mangaId: body.mangaId,
          status: body.status,
          chapters: body.chapters,
          volumes: body.volumes,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          reread: body.reread,
          connections: body.connections,
          private: isPrivate,
        },
      });

      if (body.updateConnection) {
        await this.updateMangaConnections(
          username.toLowerCase(),
          body.mangaId,
          body.connections || {},
          body.status,
          body.chapters,
          body.volumes,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.reread,
        );
      }

      const newEntry = await this.prisma.client.aquilaMangaUserList.findUnique({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId: body.mangaId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('manga', body.mangaId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update manga list',
        error: error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'manga');

    return {
      success: true,
      message: 'Manga list updated successfully',
    };
  }

  public async deleteMangaList(
    username: string,
    mangaId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaMangaUserList.findUnique({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
      });

      await this.prisma.client.aquilaMangaUserList.delete({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('manga', mangaId, entry, null);

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections)) {
          const conn = entry.connections[providerKey];
          if (!conn) continue;
          const providerId =
            typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteManga(providerKey, username.toLowerCase(), providerId)
              .catch((err) =>
                this.logger.error(
                  `Failed to delete manga connection for provider ${providerKey}`,
                  err,
                ),
              );
          }
        }
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'manga');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete manga from list',
        error: error,
      };
    }
  }
  private async updateMangaConnections(
    username: string,
    mangaId: number,
    connections: any,
    status?: string,
    chapters?: number,
    volumes?: number,
    score?: number,
    startDate?: number,
    endDate?: number,
    notes?: string,
    reread?: number,
  ) {
    if (!connections || typeof connections !== 'object') return;

    for (const providerKey of Object.keys(connections)) {
      const conn = connections[providerKey];
      if (!conn) continue;

      let providerId: number;
      let connStatus = status;
      let connChapters = chapters;
      let connVolumes = volumes;
      let connScore = score;
      let connStartDate = startDate;
      let connEndDate = endDate;
      let connNotes = notes;
      let connReread = reread;

      if (typeof conn === 'object' && conn !== null) {
        providerId = Number(conn.id);
        if (conn.status !== undefined) connStatus = conn.status;
        if (conn.chaptersOffset !== undefined) {
          connChapters = (chapters || 0) + Number(conn.chaptersOffset);
        } else if (conn.chapters !== undefined) {
          connChapters = Number(conn.chapters);
        }
        if (conn.volumesOffset !== undefined) {
          connVolumes = (volumes || 0) + Number(conn.volumesOffset);
        } else if (conn.volumes !== undefined) {
          connVolumes = Number(conn.volumes);
        }
        if (conn.score !== undefined) connScore = Number(conn.score);
        if (conn.startDate !== undefined) connStartDate = conn.startDate;
        if (conn.endDate !== undefined) connEndDate = conn.endDate;
        if (conn.notes !== undefined) connNotes = conn.notes;
        if (conn.reread !== undefined) connReread = Number(conn.reread);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      await this.connectionsManager
        .syncManga(providerKey, username, providerId, {
          status: connStatus,
          chapters: connChapters,
          volumes: connVolumes,
          score: connScore,
          startDate: connStartDate,
          endDate: connEndDate,
          notes: connNotes,
          reread: connReread,
        })
        .catch((err) =>
          this.logger.error(`Failed to sync manga with ${providerKey}`, err),
        );
    }
  }

  private async updateMovieConnections(
    username: string,
    tvdbId: number,
    connections: any,
    status?: string,
    score?: number,
    startDate?: number,
    endDate?: number,
    notes?: string,
    rewatched?: number,
  ) {
    if (!connections || typeof connections !== 'object') return;

    for (const providerKey of Object.keys(connections)) {
      const conn = connections[providerKey];
      if (!conn) continue;

      let providerId: number;
      let connStatus = status;
      let connScore = score;
      let connStartDate = startDate;
      let connEndDate = endDate;
      let connNotes = notes;
      let connRewatched = rewatched;

      if (typeof conn === 'object' && conn !== null) {
        providerId = Number(conn.id);
        if (conn.status !== undefined) connStatus = conn.status;
        if (conn.score !== undefined) connScore = Number(conn.score);
        if (conn.startDate !== undefined) connStartDate = conn.startDate;
        if (conn.endDate !== undefined) connEndDate = conn.endDate;
        if (conn.notes !== undefined) connNotes = conn.notes;
        if (conn.rewatched !== undefined)
          connRewatched = Number(conn.rewatched);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      await this.connectionsManager
        .syncMovie(providerKey, username, providerId, {
          status: connStatus,
          score: connScore,
          startDate: connStartDate,
          endDate: connEndDate,
          notes: connNotes,
          rewatched: connRewatched,
        })
        .catch((err) =>
          this.logger.error(`Failed to sync movie with ${providerKey}`, err),
        );
    }
  }

  private async updateTvConnections(
    username: string,
    tvId: number,
    connections: any,
    status?: string,
    score?: number,
    startDate?: number,
    endDate?: number,
    notes?: string,
    rewatched?: number,
  ) {
    if (!connections || typeof connections !== 'object') return;

    // Fetch watched episodes to sync progress
    const listEntry = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvId: {
          username: username.toLowerCase(),
          tvId,
        },
      },
      include: {
        watchedEpisodes: true,
      },
    });

    const watchedEpisodes = listEntry?.watchedEpisodes || [];

    for (const providerKey of Object.keys(connections)) {
      const conn = connections[providerKey];
      if (!conn) continue;

      let providerId: number;
      let connStatus = status;
      let connScore = score;
      let connStartDate = startDate;
      let connEndDate = endDate;
      let connNotes = notes;
      let connRewatched = rewatched;

      if (typeof conn === 'object' && conn !== null) {
        providerId = Number(conn.id);
        if (conn.status !== undefined) connStatus = conn.status;
        if (conn.score !== undefined) connScore = Number(conn.score);
        if (conn.startDate !== undefined) connStartDate = conn.startDate;
        if (conn.endDate !== undefined) connEndDate = conn.endDate;
        if (conn.notes !== undefined) connNotes = conn.notes;
        if (conn.rewatched !== undefined)
          connRewatched = Number(conn.rewatched);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      await this.connectionsManager
        .syncTv(providerKey, username, providerId, {
          status: connStatus,
          score: connScore,
          startDate: connStartDate,
          endDate: connEndDate,
          notes: connNotes,
          rewatched: connRewatched,
          watchedEpisodes: watchedEpisodes.map((ep) => ({
            seasonNum: ep.seasonNum,
            episodeNum: ep.episodeNum,
          })),
        })
        .catch((err) =>
          this.logger.error(`Failed to sync TV show with ${providerKey}`, err),
        );
    }
  }

  // ─────────────────────────── MOVIE ───────────────────────────

  public async getMovieList(
    username: string,
    requester?: string,
    query?: ListQueryOptions,
  ): Promise<{ entries: ListEntity[]; counts: Record<string, number> }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new rrNotFoundException(`${this.moduleCode}UNF004`, {
        message: `User ${username} not found`,
      });
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.movieList) && !isOwner) {
      throw new rrForbiddenException(`${this.moduleCode}TLIP003`, {
        message: 'This list is private',
      });
    }

    const statusEnum = this.getPrismaStatus<$Enums.MovieListStatus>(
      query?.status,
      $Enums.MovieListStatus,
    );
    const search = query?.search?.trim();
    const genres = query?.genres?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search || genres || mediaStatus) {
      whereClause.movie = {};
      if (search) {
        whereClause.movie.OR = [
          { titleEnglish: { contains: search, mode: 'insensitive' } },
          { titleRomaji: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.movie.genres = { hasEvery: genreList };
      }
      if (mediaStatus) {
        whereClause.movie.status = mediaStatus;
      }
    }

    const [list, counts] = await Promise.all([
      this.prisma.client.aquilaMovieUserList.findMany({
        where: whereClause,
        take: query?.limit ?? 30,
        skip: query?.offset ?? 0,
        orderBy: this.getMovieOrderBy(query?.sort),
        select: {
          movieId: true,
          status: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          movie: {
            select: {
              titleEnglish: true,
              titleRomaji: true,
              coverImage: true,
              status: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaMovieUserList, username),
    ]);

    const mappedList: ListEntity[] = list.map((item) => ({
      id: item.movieId,
      title: item.movie.titleEnglish ?? item.movie.titleRomaji ?? '',
      score: item.score,
      progress: item.status === 'COMPLETED' ? 1 : 0,
      episodes: 1,
      image: item.movie.coverImage ?? '',
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'movie',
      format: 'Movie',
      mediaStatus: item.movie.status || undefined,
    }));

    return { entries: mappedList, counts };
  }

  public async getMovieListEntry(username: string, movieId: number) {
    const out = await this.prisma.client.aquilaMovieUserList.findUnique({
      where: {
        username_movieId: {
          username: username.toLowerCase(),
          movieId,
        },
      },
    });

    if (!out)
      throw new rrNotFoundException(`${this.moduleCode}MNFIL002`, {
        message: 'Movie not found in list',
      });
    return out;
  }

  public async upsertMovieList(
    username: string,
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
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.movieList);

      const oldEntry = await this.prisma.client.aquilaMovieUserList.findUnique({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId: body.movieId,
          },
        },
      });

      await this.prisma.client.aquilaMovieUserList.upsert({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId: body.movieId,
          },
        },
        update: {
          status: body.status,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          movieId: body.movieId,
          status: body.status,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
          private: isPrivate,
        },
      });

      if (body.updateConnection) {
        await this.updateMovieConnections(
          username.toLowerCase(),
          body.movieId,
          body.connections || {},
          body.status,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.rewatched,
        );
      }

      const newEntry = await this.prisma.client.aquilaMovieUserList.findUnique({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId: body.movieId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('movie', body.movieId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update movie list',
        error: error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'movie');

    return {
      success: true,
      message: 'Movie list updated successfully',
    };
  }

  public async deleteMovieList(
    username: string,
    movieId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaMovieUserList.findUnique({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId,
          },
        },
      });

      await this.prisma.client.aquilaMovieUserList.delete({
        where: {
          username_movieId: {
            username: username.toLowerCase(),
            movieId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('movie', movieId, entry, null);

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections)) {
          const conn = entry.connections[providerKey];
          if (!conn) continue;
          const providerId =
            typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteMovie(providerKey, username.toLowerCase(), providerId)
              .catch((err) =>
                this.logger.error(
                  `Failed to delete movie connection for provider ${providerKey}`,
                  err,
                ),
              );
          }
        }
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'movie');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete movie from list',
        error: error,
      };
    }
  }

  // ─────────────────────────── TV ───────────────────────────

  public async getTvList(
    username: string,
    requester?: string,
    query?: ListQueryOptions,
  ): Promise<{ entries: ListEntity[]; counts: Record<string, number> }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new rrNotFoundException(`${this.moduleCode}UNF005`, {
        message: `User ${username} not found`,
      });
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.tvList) && !isOwner) {
      throw new rrForbiddenException(`${this.moduleCode}TLIP004`, {
        message: 'This list is private',
      });
    }

    const statusEnum = this.getPrismaStatus<$Enums.TvListStatus>(
      query?.status,
      $Enums.TvListStatus,
    );
    const search = query?.search?.trim();
    const format = query?.format?.trim(); // tvType
    const genres = query?.genres?.trim();
    const mediaStatus = query?.mediaStatus?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search || format || genres || mediaStatus) {
      whereClause.tv = {};
      if (search) {
        whereClause.tv.OR = [
          { titleEnglish: { contains: search, mode: 'insensitive' } },
          { titleRomaji: { contains: search, mode: 'insensitive' } },
        ];
      }
      // format (tvType) is not available on AquilaTv model
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.tv.genres = { hasEvery: genreList };
      }
      if (mediaStatus) {
        whereClause.tv.status = mediaStatus;
      }
    }

    const [list, counts] = await Promise.all([
      this.prisma.client.aquilaTvUserList.findMany({
        where: whereClause,
        take: query?.limit ?? 30,
        skip: query?.offset ?? 0,
        orderBy: this.getTvOrderBy(query?.sort),
        select: {
          tvId: true,
          status: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          tv: {
            select: {
              titleEnglish: true,
              titleRomaji: true,
              coverImage: true,
              seasons: true,
              status: true,
            },
          },
          _count: {
            select: {
              watchedEpisodes: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaTvUserList, username),
    ]);

    const mappedList: ListEntity[] = list.map((item) => {
      // Calculate total episodes from seasons JSON
      let totalEpisodes = 0;
      const seasons = item.tv.seasons as any[];
      if (seasons) {
        seasons.forEach((s) => {
          totalEpisodes += s.episodeCount || 0;
        });
      }

      return {
        id: item.tvId,
        title: item.tv.titleEnglish ?? item.tv.titleRomaji ?? '',
        score: item.score,
        progress: item._count.watchedEpisodes,
        episodes: totalEpisodes,
        image: item.tv.coverImage ?? '',
        format: 'TV',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'tv',
        mediaStatus: item.tv.status || undefined,
      };
    });

    return { entries: mappedList, counts };
  }

  public async getTvListEntry(username: string, tvId: number) {
    const out = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvId: {
          username: username.toLowerCase(),
          tvId,
        },
      },
      include: {
        watchedEpisodes: true,
      },
    });

    if (!out)
      throw new rrNotFoundException(`${this.moduleCode}TNFIL001`, {
        message: 'TV show not found in list',
      });
    return out;
  }

  public async upsertTvList(
    username: string,
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
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.tvList);

      const oldEntry = await this.prisma.client.aquilaTvUserList.findUnique({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId: body.tvId,
          },
        },
      });

      const listEntry = await this.prisma.client.aquilaTvUserList.upsert({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId: body.tvId,
          },
        },
        update: {
          status: body.status,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          tvId: body.tvId,
          status: body.status,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
          private: isPrivate,
        },
      });

      if (body.episodes) {
        await this.prisma.client.aquilaTvWatchedEpisode.deleteMany({
          where: { listId: listEntry.id },
        });
        if (body.episodes.length > 0) {
          await this.prisma.client.aquilaTvWatchedEpisode.createMany({
            data: body.episodes.map((ep) => ({
              listId: listEntry.id,
              seasonNum: ep.seasonNum,
              episodeNum: ep.episodeNum,
            })),
          });
        }
      }

      if (body.updateConnection) {
        await this.updateTvConnections(
          username.toLowerCase(),
          body.tvId,
          body.connections || {},
          body.status,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.rewatched,
        );
      }

      const newEntry = await this.prisma.client.aquilaTvUserList.findUnique({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId: body.tvId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('tv', body.tvId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update TV list',
        error: error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'tv');

    return {
      success: true,
      message: 'TV list updated successfully',
    };
  }

  public async deleteTvList(
    username: string,
    tvId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaTvUserList.findUnique({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId,
          },
        },
      });

      await this.prisma.client.aquilaTvUserList.delete({
        where: {
          username_tvId: {
            username: username.toLowerCase(),
            tvId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('tv', tvId, entry, null);

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections)) {
          const conn = entry.connections[providerKey];
          if (!conn) continue;
          const providerId =
            typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager
              .deleteTv(providerKey, username.toLowerCase(), providerId)
              .catch((err) =>
                this.logger.error(
                  `Failed to delete TV connection for provider ${providerKey}`,
                  err,
                ),
              );
          }
        }
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'tv');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete TV show from list',
        error: error,
      };
    }
  }

  public async toggleEpisodeWatched(
    username: string,
    tvdbId: number,
    seasonNum: number,
    episodeNum: number,
  ) {
    const listEntry = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvId: {
          username: username.toLowerCase(),
          tvId: tvdbId,
        },
      },
    });

    if (!listEntry)
      throw new rrNotFoundException(`${this.moduleCode}TNFIL002`, {
        message: 'TV show not in list',
      });

    const existing = await this.prisma.client.aquilaTvWatchedEpisode.findUnique(
      {
        where: {
          listId_seasonNum_episodeNum: {
            listId: listEntry.id,
            seasonNum,
            episodeNum,
          },
        },
      },
    );

    let watched: boolean;
    if (existing) {
      await this.prisma.client.aquilaTvWatchedEpisode.delete({
        where: { id: existing.id },
      });
      watched = false;
    } else {
      await this.prisma.client.aquilaTvWatchedEpisode.create({
        data: {
          listId: listEntry.id,
          seasonNum,
          episodeNum,
        },
      });
      watched = true;
    }

    if (listEntry.connections && typeof listEntry.connections === 'object') {
      await this.updateTvConnections(
        username.toLowerCase(),
        tvdbId,
        listEntry.connections,
        listEntry.status,
        listEntry.score || undefined,
        listEntry.startDate || undefined,
        listEntry.endDate || undefined,
        listEntry.notes || undefined,
        listEntry.rewatched || undefined,
      ).catch((err) =>
        this.logger.error('Failed to sync toggled episode tv connection', err),
      );
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'tv');

    return { watched };
  }

  public async toggleSeasonWatched(
    username: string,
    tvdbId: number,
    seasonNum: number,
    episodes: { number: number }[],
    watched: boolean,
  ) {
    const listEntry = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvId: {
          username: username.toLowerCase(),
          tvId: tvdbId,
        },
      },
    });

    if (!listEntry)
      throw new rrNotFoundException(`${this.moduleCode}TNFIL003`, {
        message: 'TV show not in list',
      });

    if (watched) {
      // Mark all as watched
      for (const ep of episodes) {
        await this.prisma.client.aquilaTvWatchedEpisode.upsert({
          where: {
            listId_seasonNum_episodeNum: {
              listId: listEntry.id,
              seasonNum,
              episodeNum: ep.number,
            },
          },
          update: {},
          create: {
            listId: listEntry.id,
            seasonNum,
            episodeNum: ep.number,
          },
        });
      }
    } else {
      // Mark all as unwatched
      await this.prisma.client.aquilaTvWatchedEpisode.deleteMany({
        where: {
          listId: listEntry.id,
          seasonNum,
        },
      });
    }

    if (listEntry.connections && typeof listEntry.connections === 'object') {
      await this.updateTvConnections(
        username.toLowerCase(),
        tvdbId,
        listEntry.connections,
        listEntry.status,
        listEntry.score || undefined,
        listEntry.startDate || undefined,
        listEntry.endDate || undefined,
        listEntry.notes || undefined,
        listEntry.rewatched || undefined,
      ).catch((err) =>
        this.logger.error('Failed to sync toggled season tv connection', err),
      );
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'tv');

    return { success: true };
  }

  // ─────────────────────────── GAME ───────────────────────────

  public async getGameList(
    username: string,
    requester?: string,
    query?: ListQueryOptions,
  ): Promise<{ entries: ListEntity[]; counts: Record<string, number> }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new rrNotFoundException(`${this.moduleCode}UNF006`, {
        message: `User ${username} not found`,
      });
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.gameList) && !isOwner) {
      throw new rrForbiddenException(`${this.moduleCode}TLIP005`, {
        message: 'This list is private',
      });
    }

    const statusEnum = this.getPrismaStatus<$Enums.GameListStatus>(
      query?.status,
      $Enums.GameListStatus,
    );
    const search = query?.search?.trim();
    const format = query?.format?.trim(); // platforms
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search || format || genres || year) {
      whereClause.game = {};
      if (search) {
        whereClause.game.titleString = {
          contains: search,
          mode: 'insensitive',
        };
      }
      if (format) {
        whereClause.game.platforms = { has: format };
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.game.genres = { hasEvery: genreList };
      }
      if (year) {
        whereClause.game.releasedYear = Number(year);
      }
    }

    const [list, counts] = await Promise.all([
      this.prisma.client.aquilaGameUserList.findMany({
        where: whereClause,
        take: query?.limit ?? 30,
        skip: query?.offset ?? 0,
        orderBy: this.getGameOrderBy(query?.sort),
        select: {
          gameId: true,
          status: true,
          progress: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          game: {
            select: {
              titleString: true,
              coverImage: true,
              releasedYear: true,
              releasedMonth: true,
              releasedDay: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaGameUserList, username),
    ]);

    const mappedList: ListEntity[] = list.map((item) => ({
      id: item.gameId,
      title: item.game.titleString ?? '',
      score: item.score,
      progress: item.progress,
      episodes: null,
      image: item.game.coverImage ?? '',
      format: 'Game',
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'game',
      mediaStatus: (() => {
        if (!item.game.releasedYear) return undefined;
        const releaseDate = new Date(
          item.game.releasedYear,
          (item.game.releasedMonth || 1) - 1,
          item.game.releasedDay || 1,
        );
        return releaseDate > new Date() ? 'NOT_YET_RELEASED' : 'RELEASED';
      })(),
    }));

    return { entries: mappedList, counts };
  }

  public async getGameListEntry(username: string, gameId: number) {
    const out = await this.prisma.client.aquilaGameUserList.findUnique({
      where: {
        username_gameId: {
          username: username.toLowerCase(),
          gameId,
        },
      },
    });

    if (!out)
      throw new rrNotFoundException(`${this.moduleCode}GNFIL001`, {
        message: 'Game not found in list',
      });
    return out;
  }

  public async upsertGameList(
    username: string,
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
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.gameList);

      const oldEntry = await this.prisma.client.aquilaGameUserList.findUnique({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId: body.gameId,
          },
        },
      });

      await this.prisma.client.aquilaGameUserList.upsert({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId: body.gameId,
          },
        },
        update: {
          status: body.status,
          progress: body.progress,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
        },
        create: {
          username: username.toLowerCase(),
          gameId: body.gameId,
          status: body.status,
          progress: body.progress,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          private: isPrivate,
        },
      });

      const newEntry = await this.prisma.client.aquilaGameUserList.findUnique({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId: body.gameId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('game', body.gameId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update game list',
        error: error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'game');

    return {
      success: true,
      message: 'Game list updated successfully',
    };
  }

  public async deleteGameList(
    username: string,
    gameId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaGameUserList.findUnique({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId,
          },
        },
      });

      await this.prisma.client.aquilaGameUserList.delete({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('game', gameId, entry, null);

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'game');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete game from list',
        error: error,
      };
    }
  }

  // ─────────────────────────── BOOK ───────────────────────────

  public async getBookList(
    username: string,
    requester?: string,
    query?: ListQueryOptions,
  ): Promise<{ entries: ListEntity[]; counts: Record<string, number> }> {
    const owner = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { privacy: true },
    });

    if (!owner) {
      throw new rrNotFoundException(`${this.moduleCode}UNF007`, {
        message: `User ${username} not found`,
      });
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.bookList) && !isOwner) {
      throw new rrForbiddenException(`${this.moduleCode}TLIP006`, {
        message: 'This list is private',
      });
    }

    const statusEnum = this.getPrismaStatus<$Enums.BookListStatus>(
      query?.status,
      $Enums.BookListStatus,
    );
    const search = query?.search?.trim();
    const genres = query?.genres?.trim();
    const year = query?.year?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search || genres || year) {
      whereClause.book = {};
      if (search) {
        whereClause.book.titleString = {
          contains: search,
          mode: 'insensitive',
        };
      }
      if (genres) {
        const genreList = genres.split(',').map((g) => g.trim());
        whereClause.book.subjects = { hasEvery: genreList };
      }
      if (year) {
        whereClause.book.publishedYear = Number(year);
      }
    }

    const [list, counts] = await Promise.all([
      this.prisma.client.aquilaBookUserList.findMany({
        where: whereClause,
        take: query?.limit ?? 30,
        skip: query?.offset ?? 0,
        orderBy: this.getBookOrderBy(query?.sort),
        select: {
          bookId: true,
          status: true,
          chapters: true,
          volumes: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          book: {
            select: {
              titleString: true,
              coverImage: true,
              publishedYear: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaBookUserList, username),
    ]);

    const mappedList: ListEntity[] = list.map((item) => ({
      id: item.bookId,
      title: item.book.titleString ?? '',
      score: item.score,
      progress: item.chapters,
      episodes: null,
      image: item.book.coverImage ?? '',
      format: 'Book',
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'book',
      mediaStatus: (() => {
        if (!item.book.publishedYear) return undefined;
        return item.book.publishedYear > new Date().getFullYear()
          ? 'NOT_YET_RELEASED'
          : 'RELEASED';
      })(),
    }));

    return { entries: mappedList, counts };
  }

  public async getBookListEntry(username: string, bookId: string) {
    const out = await this.prisma.client.aquilaBookUserList.findUnique({
      where: {
        username_bookId: {
          username: username.toLowerCase(),
          bookId: parseInt(bookId, 10),
        },
      },
    });

    if (!out)
      throw new rrNotFoundException(`${this.moduleCode}BNFIL001`, {
        message: 'Book not found in list',
      });
    return out;
  }

  public async upsertBookList(
    username: string,
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
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { privacy: true },
      });
      const privacy = parsePrivacy(user?.privacy);
      const isPrivate = !!(privacy.profile || privacy.bookList);

      const intBookId = parseInt(body.bookId, 10);
      const oldEntry = await this.prisma.client.aquilaBookUserList.findUnique({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId: intBookId,
          },
        },
      });

      await this.prisma.client.aquilaBookUserList.upsert({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId: intBookId,
          },
        },
        update: {
          status: body.status,
          chapters: body.chapters,
          volumes: body.volumes,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
        },
        create: {
          username: username.toLowerCase(),
          bookId: intBookId,
          status: body.status,
          chapters: body.chapters,
          volumes: body.volumes,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          private: isPrivate,
        },
      });

      const newEntry = await this.prisma.client.aquilaBookUserList.findUnique({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId: intBookId,
          },
        },
      });
      void this.mediaStatsService.updateStatsIncremental('book', intBookId, oldEntry, newEntry);
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update book list',
        error: error,
      };
    }

    const userId = await this.getUserId(username);
    void this.statsService.recalculate(userId, 'book');

    return {
      success: true,
      message: 'Book list updated successfully',
    };
  }

  public async deleteBookList(
    username: string,
    bookId: string,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const intBookId = parseInt(bookId, 10);
      const entry = await this.prisma.client.aquilaBookUserList.findUnique({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId: intBookId,
          },
        },
      });

      await this.prisma.client.aquilaBookUserList.delete({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId: intBookId,
          },
        },
      });

      void this.mediaStatsService.updateStatsIncremental('book', intBookId, entry, null);

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'book');

      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete book from list',
        error: error,
      };
    }
  }

  public async getWatchingList(username: string): Promise<ListEntity[]> {
    const animeWatching = await this.prisma.client.aquilaAnimeUserList.findMany(
      {
        where: {
          username: username.toLowerCase(),
          status: $Enums.AnimeListStatus.WATCHING,
        },
        include: {
          anime: true,
        },
      },
    );

    const mangaReading = await this.prisma.client.aquilaMangaUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.MangaListStatus.READING,
      },
      include: {
        manga: true,
      },
    });

    const tvWatching = await this.prisma.client.aquilaTvUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.TvListStatus.WATCHING,
      },
      include: {
        tv: true,
        watchedEpisodes: true,
      },
    });

    const gamesPlaying = await this.prisma.client.aquilaGameUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.GameListStatus.PLAYING,
      },
      include: {
        game: true,
      },
    });

    const booksReading = await this.prisma.client.aquilaBookUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.BookListStatus.READING,
      },
      include: {
        book: true,
      },
    });

    const watchingList: ListEntity[] = [];

    animeWatching.forEach((item) => {
      watchingList.push({
        id: item.animeId,
        title:
          item.anime.titleEnglish ??
          item.anime.titleRomaji ??
          item.anime.titleNative ??
          '',
        score: item.score,
        progress: item.progress,
        episodes: item.anime.episodes,
        image: item.anime.coverImageLarge ?? '',
        format: item.anime.format ?? 'ANIME',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'anime',
      });
    });

    mangaReading.forEach((item) => {
      watchingList.push({
        id: item.mangaId,
        title: item.manga.titleEnglish ?? item.manga.titleRomaji ?? '',
        score: item.score,
        progress: item.chapters ?? 0,
        episodes: item.manga.chapters,
        image: item.manga.coverImageLarge ?? '',
        format: item.manga.format ?? 'MANGA',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'manga',
      });
    });

    tvWatching.forEach((item) => {
      const seasons = (item.tv.seasons as any[]) || [];
      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodeCount || 0),
        0,
      );

      const latestWatched = [...item.watchedEpisodes].sort((a, b) => {
        if (a.seasonNum !== b.seasonNum) return b.seasonNum - a.seasonNum;
        return b.episodeNum - a.episodeNum;
      })[0];

      watchingList.push({
        id: item.tvId,
        title: item.tv.titleEnglish ?? item.tv.titleRomaji ?? '',
        score: item.score,
        progress: item.watchedEpisodes.length,
        episodes: totalEpisodes,
        image: item.tv.coverImage ?? '',
        format: 'TV',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'tv',
        meta: latestWatched
          ? {
              season: latestWatched.seasonNum,
              episode: latestWatched.episodeNum,
            }
          : undefined,
      });
    });

    gamesPlaying.forEach((item) => {
      watchingList.push({
        id: item.gameId,
        title: item.game.titleString ?? '',
        score: item.score,
        progress: item.progress ?? 0,
        episodes: null,
        image: item.game.coverImage ?? '',
        format: 'Game',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'game',
      });
    });

    booksReading.forEach((item) => {
      watchingList.push({
        id: item.bookId,
        title: item.book.titleString ?? '',
        score: item.score,
        progress: item.chapters ?? 0,
        episodes: item.book.chapters,
        image: item.book.coverImage ?? '',
        format: 'Book',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'book',
      });
    });

    return watchingList.sort(
      (a, b) => b.last_updated.getTime() - a.last_updated.getTime(),
    );
  }

  public async incrementProgress(
    username: string,
    mediaType: 'anime' | 'manga' | 'tv' | 'game' | 'book',
    id: number | string,
    count: number = 1,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const user = username.toLowerCase();
    const countVal = Math.max(1, count);

    if (mediaType === 'game') {
      const gameIdNum = Number(id);
      if (isNaN(gameIdNum))
        throw new rrInternalServerErrorException(`${this.moduleCode}IGI001`, {
          message: 'Invalid game ID',
        });
      const entry = await this.prisma.client.aquilaGameUserList.findUnique({
        where: { username_gameId: { username: user, gameId: gameIdNum } },
      });
      if (!entry)
        throw new rrNotFoundException(`${this.moduleCode}GNFIL002`, {
          message: 'Game not in list',
        });

      const nextProgress = (entry.progress || 0) + countVal;
      await this.prisma.client.aquilaGameUserList.update({
        where: { id: entry.id },
        data: {
          progress: nextProgress,
        },
      });

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'game');

      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'book') {
      const bookIdStr = String(id);
      const entry = await this.prisma.client.aquilaBookUserList.findUnique({
        where: { username_bookId: { username: user, bookId: bookIdStr } },
        include: { book: true },
      });
      if (!entry)
        throw new rrNotFoundException(`${this.moduleCode}BNFIL002`, {
          message: 'Book not in list',
        });

      const nextProgress = (entry.chapters || 0) + countVal;
      const isCompleted = !!(
        entry.book.chapters && nextProgress >= entry.book.chapters
      );

      await this.prisma.client.aquilaBookUserList.update({
        where: { id: entry.id },
        data: {
          chapters: nextProgress,
          status: isCompleted ? $Enums.BookListStatus.COMPLETED : entry.status,
          endDate: isCompleted ? Math.floor(Date.now() / 1000) : entry.endDate,
        },
      });

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'book');

      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'anime') {
      const animeIdNum = Number(id);
      if (isNaN(animeIdNum))
        throw new rrInternalServerErrorException(`${this.moduleCode}IAI001`, {
          message: 'Invalid anime ID',
        });
      const entry = await this.prisma.client.aquilaAnimeUserList.findUnique({
        where: { username_animeId: { username: user, animeId: animeIdNum } },
        include: { anime: true },
      });
      if (!entry)
        throw new rrNotFoundException(`${this.moduleCode}ANFIL002`, {
          message: 'Anime not in list',
        });

      const nextProgress = (entry.progress || 0) + countVal;
      const isCompleted =
        entry.anime.episodes && nextProgress >= entry.anime.episodes;

      const connectionsData = entry.connections as any;
      let nextConnections = connectionsData;
      if (
        connectionsData &&
        typeof connectionsData === 'object' &&
        !Array.isArray(connectionsData)
      ) {
        nextConnections = { ...connectionsData };
        for (const key of Object.keys(nextConnections)) {
          const conn = nextConnections[key];
          if (conn && typeof conn === 'object' && !Array.isArray(conn)) {
            if (conn.progress !== undefined) {
              nextConnections[key] = {
                ...conn,
                progress: (Number(conn.progress) || 0) + countVal,
              };
            }
          }
        }
      }

      await this.prisma.client.aquilaAnimeUserList.update({
        where: { id: entry.id },
        data: {
          progress: nextProgress,
          status: isCompleted ? $Enums.AnimeListStatus.COMPLETED : entry.status,
          endDate: isCompleted ? Math.floor(Date.now() / 1000) : entry.endDate,
          connections: nextConnections || undefined,
        },
      });

      if (nextConnections && typeof nextConnections === 'object') {
        await this.updateConnections(
          user,
          animeIdNum,
          nextConnections,
          isCompleted ? 'COMPLETED' : entry.status,
          nextProgress,
          entry.score || undefined,
          entry.startDate || undefined,
          isCompleted
            ? Math.floor(Date.now() / 1000)
            : entry.endDate || undefined,
          entry.notes || undefined,
          entry.rewatched || undefined,
        ).catch((err) =>
          this.logger.error('Failed to sync incremented anime connection', err),
        );
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'anime');

      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'manga') {
      const mangaIdNum = Number(id);
      if (isNaN(mangaIdNum))
        throw new rrInternalServerErrorException(`${this.moduleCode}IMI001`, {
          message: 'Invalid manga ID',
        });
      const entry = await this.prisma.client.aquilaMangaUserList.findUnique({
        where: { username_mangaId: { username: user, mangaId: mangaIdNum } },
        include: { manga: true },
      });
      if (!entry)
        throw new rrNotFoundException(`${this.moduleCode}MNFIL003`, {
          message: 'Manga not in list',
        });

      const nextProgress = (entry.chapters || 0) + countVal;
      const isCompleted =
        entry.manga.chapters && nextProgress >= entry.manga.chapters;

      const connectionsData = entry.connections as any;
      let nextConnections = connectionsData;
      if (
        connectionsData &&
        typeof connectionsData === 'object' &&
        !Array.isArray(connectionsData)
      ) {
        nextConnections = { ...connectionsData };
        for (const key of Object.keys(nextConnections)) {
          const conn = nextConnections[key];
          if (conn && typeof conn === 'object' && !Array.isArray(conn)) {
            if (conn.chapters !== undefined) {
              nextConnections[key] = {
                ...conn,
                chapters: (Number(conn.chapters) || 0) + countVal,
              };
            }
          }
        }
      }

      await this.prisma.client.aquilaMangaUserList.update({
        where: { id: entry.id },
        data: {
          chapters: nextProgress,
          status: isCompleted ? $Enums.MangaListStatus.COMPLETED : entry.status,
          endDate: isCompleted ? Math.floor(Date.now() / 1000) : entry.endDate,
          connections: nextConnections || undefined,
        },
      });

      if (nextConnections && typeof nextConnections === 'object') {
        await this.updateMangaConnections(
          user,
          mangaIdNum,
          nextConnections,
          isCompleted ? 'COMPLETED' : entry.status,
          nextProgress,
          entry.volumes || undefined,
          entry.score || undefined,
          entry.startDate || undefined,
          isCompleted
            ? Math.floor(Date.now() / 1000)
            : entry.endDate || undefined,
          entry.notes || undefined,
          entry.reread || undefined,
        ).catch((err) =>
          this.logger.error('Failed to sync incremented manga connection', err),
        );
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'manga');

      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'tv') {
      const tvdbIdNum = Number(id);
      if (isNaN(tvdbIdNum))
        throw new rrInternalServerErrorException(`${this.moduleCode}ITI001`, {
          message: 'Invalid TVDB ID',
        });
      const entry = await this.prisma.client.aquilaTvUserList.findUnique({
        where: { username_tvdbId: { username: user, tvdbId: tvdbIdNum } },
        include: { tv: true, watchedEpisodes: true },
      });
      if (!entry)
        throw new rrNotFoundException(`${this.moduleCode}TNFIL004`, {
          message: 'TV show not in list',
        });

      const seasons = (entry.tv.seasons as any[]) || [];
      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodeCount || 0),
        0,
      );

      // Find the next count episodes to watch
      const nextEps: { seasonNum: number; episodeNum: number }[] = [];

      for (const season of seasons) {
        for (const ep of season.episodes) {
          const isWatched = entry.watchedEpisodes.some(
            (we) =>
              we.seasonNum === season.number && we.episodeNum === ep.number,
          );
          if (!isWatched) {
            nextEps.push({ seasonNum: season.number, episodeNum: ep.number });
            if (nextEps.length === countVal) break;
          }
        }
        if (nextEps.length === countVal) break;
      }

      if (nextEps.length === 0) {
        return { success: false, message: 'All episodes already watched' };
      }

      await this.prisma.client.aquilaTvWatchedEpisode.createMany({
        data: nextEps.map((ep) => ({
          listId: entry.id,
          seasonNum: ep.seasonNum,
          episodeNum: ep.episodeNum,
        })),
      });

      const totalWatched = entry.watchedEpisodes.length + nextEps.length;
      const isCompleted = totalWatched >= totalEpisodes;

      if (isCompleted) {
        await this.prisma.client.aquilaTvUserList.update({
          where: { id: entry.id },
          data: {
            status: $Enums.TvListStatus.COMPLETED,
            endDate: Math.floor(Date.now() / 1000),
          },
        });
      }

      if (entry.connections && typeof entry.connections === 'object') {
        await this.updateTvConnections(
          user,
          tvdbIdNum,
          entry.connections,
          isCompleted ? 'COMPLETED' : entry.status,
          entry.score || undefined,
          entry.startDate || undefined,
          isCompleted
            ? Math.floor(Date.now() / 1000)
            : entry.endDate || undefined,
          entry.notes || undefined,
          entry.rewatched || undefined,
        ).catch((err) =>
          this.logger.error('Failed to sync incremented tv connection', err),
        );
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'tv');

      return {
        success: true,
        message: 'Progress updated',
        data: { nextEp: nextEps[nextEps.length - 1], isCompleted },
      };
    }

    return { success: false, message: 'Invalid media type' };
  }

  public async getUserListFilters(username: string, mediaType: string) {
    username = username.toLowerCase();
    switch (mediaType) {
      case 'anime': {
        const list = await this.prisma.client.aquilaAnimeUserList.findMany({
          where: { username },
          select: {
            anime: {
              select: {
                genres: true,
                startDateYear: true,
                format: true,
                status: true,
              },
            },
          },
        });
        const genres = new Set<string>();
        const years = new Set<number>();
        const formats = new Set<string>();
        const statuses = new Set<string>();
        list.forEach((item) => {
          if (item.anime) {
            item.anime.genres?.forEach((g) => genres.add(g));
            if (item.anime.startDateYear) years.add(item.anime.startDateYear);
            if (item.anime.format) formats.add(item.anime.format);
            if (item.anime.status) statuses.add(item.anime.status);
          }
        });
        return {
          genres: Array.from(genres).sort(),
          years: Array.from(years).sort((a, b) => b - a),
          formats: Array.from(formats).sort(),
          statuses: Array.from(statuses).sort(),
        };
      }
      case 'manga': {
        const list = await this.prisma.client.aquilaMangaUserList.findMany({
          where: { username },
          select: {
            manga: {
              select: {
                genres: true,
                startDateYear: true,
                format: true,
                status: true,
              },
            },
          },
        });
        const genres = new Set<string>();
        const years = new Set<number>();
        const formats = new Set<string>();
        const statuses = new Set<string>();
        list.forEach((item) => {
          if (item.manga) {
            item.manga.genres?.forEach((g) => genres.add(g));
            if (item.manga.startDateYear) years.add(item.manga.startDateYear);
            if (item.manga.format) formats.add(item.manga.format);
            if (item.manga.status) statuses.add(item.manga.status);
          }
        });
        return {
          genres: Array.from(genres).sort(),
          years: Array.from(years).sort((a, b) => b - a),
          formats: Array.from(formats).sort(),
          statuses: Array.from(statuses).sort(),
        };
      }
      case 'movie': {
        const list = await this.prisma.client.aquilaMovieUserList.findMany({
          where: { username },
          select: {
            movie: {
              select: { genres: true, status: true },
            },
          },
        });
        const genres = new Set<string>();
        const statuses = new Set<string>();
        list.forEach((item) => {
          if (item.movie) {
            item.movie.genres?.forEach((g) => genres.add(g));
            if (item.movie.status) statuses.add(item.movie.status);
          }
        });
        return {
          genres: Array.from(genres).sort(),
          years: [],
          formats: [],
          statuses: Array.from(statuses).sort(),
        };
      }
      case 'tv': {
        const list = await this.prisma.client.aquilaTvUserList.findMany({
          where: { username },
          select: {
            tv: {
              select: { genres: true, status: true },
            },
          },
        });
        const genres = new Set<string>();
        const formats = new Set<string>();
        const statuses = new Set<string>();
        list.forEach((item) => {
          if (item.tv) {
            item.tv.genres?.forEach((g) => genres.add(g));
            if (item.tv.status) statuses.add(item.tv.status);
          }
        });
        return {
          genres: Array.from(genres).sort(),
          years: [],
          formats: Array.from(formats).sort(),
          statuses: Array.from(statuses).sort(),
        };
      }
      case 'game': {
        const list = await this.prisma.client.aquilaGameUserList.findMany({
          where: { username },
          select: {
            game: {
              select: { genres: true, releasedYear: true, platforms: true },
            },
          },
        });
        const genres = new Set<string>();
        const years = new Set<number>();
        const formats = new Set<string>();
        list.forEach((item) => {
          if (item.game) {
            item.game.genres?.forEach((g) => genres.add(g));
            if (item.game.releasedYear) years.add(item.game.releasedYear);
            item.game.platforms?.forEach((p) => formats.add(p));
          }
        });
        return {
          genres: Array.from(genres).sort(),
          years: Array.from(years).sort((a, b) => b - a),
          formats: Array.from(formats).sort(),
          statuses: [],
        };
      }
      case 'book': {
        const list = await this.prisma.client.aquilaBookUserList.findMany({
          where: { username },
          select: {
            book: {
              select: { subjects: true, publishedYear: true },
            },
          },
        });
        const genres = new Set<string>();
        const years = new Set<number>();
        list.forEach((item) => {
          if (item.book) {
            item.book.subjects?.forEach((s) => genres.add(s));
            if (item.book.publishedYear) years.add(item.book.publishedYear);
          }
        });
        return {
          genres: Array.from(genres).sort(),
          years: Array.from(years).sort((a, b) => b - a),
          formats: [],
          statuses: [],
        };
      }
      default:
        throw new rrNotFoundException(`${this.moduleCode}UMT001`, {
          message: `Unsupported media type: ${mediaType}`,
        });
    }
  }

  // ─────────────────────────── RADARR/SONARR ───────────────────────────

  public async getRadarrMovieList(username: string): Promise<any[]> {
    this.logger.log(`Fetching Radarr movie list for user ${username}`);

    const movieEntries = await this.prisma.client.aquilaMovieUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: 'PLANNING',
      },
      select: {
        id: true,
        connections: true,
        movie: {
          select: {
            tvdbId: true,
            titleEnglish: true,
            titleRomaji: true,
          },
        },
      },
    });

    const resultList: any[] = [];

    for (const entry of movieEntries) {
      let tmdbId: number | undefined;
      let imdbId: string | undefined;

      const connectionsObj = (entry.connections as Record<string, any>) || {};

      if (connectionsObj.tmdbId) {
        tmdbId = connectionsObj.tmdbId;
        imdbId = connectionsObj.imdbId;
      } else {
        // Resolve dynamically from TVDB API
        const remoteIds = await this.movieService.getRemoteIds(
          entry.movie.tvdbId,
        );
        if (remoteIds) {
          tmdbId = remoteIds.tmdbId;
          imdbId = remoteIds.imdbId;

          // Cache in database
          try {
            await this.prisma.client.aquilaMovieUserList.update({
              where: { id: entry.id },
              data: {
                connections: {
                  ...connectionsObj,
                  tmdbId,
                  imdbId,
                },
              },
            });
          } catch (dbErr) {
            this.logger.error(
              `Failed to save resolved movie IDs for entry ${entry.id}:`,
              dbErr,
            );
          }
        }
      }

      if (tmdbId) {
        const title =
          entry.movie.titleEnglish ||
          entry.movie.titleRomaji ||
          'Unknown Movie';
        resultList.push({
          title,
          tmdbId,
          imdbId: imdbId || null,
          year: 0,
          monitored: true,
          id: tmdbId,
        });
      }
    }

    return resultList;
  }

  public async fetchSonarrSeries(
    username: string,
    includeTv: boolean,
    includeAnime: boolean,
  ): Promise<any[]> {
    const resultList: any[] = [];

    if (includeTv) {
      const tvEntries = await this.prisma.client.aquilaTvUserList.findMany({
        where: {
          username: username.toLowerCase(),
          status: 'PLANNING',
        },
        select: {
          tv: {
            select: {
              tvdbId: true,
              titleEnglish: true,
              titleRomaji: true,
            },
          },
        },
      });

      for (const entry of tvEntries) {
        const title =
          entry.tv.titleEnglish || entry.tv.titleRomaji || 'Unknown TV Show';
        resultList.push({
          title,
          tvdbId: entry.tv.tvdbId,
          year: 0,
          monitored: true,
          seasons: [],
        });
      }
    }

    if (includeAnime) {
      const animeEntries =
        await this.prisma.client.aquilaAnimeUserList.findMany({
          where: {
            username: username.toLowerCase(),
            status: 'PLANNING',
          },
          select: {
            id: true,
            animeId: true,
            connections: true,
            anime: {
              select: {
                titleEnglish: true,
                titleRomaji: true,
                seasonYear: true,
              },
            },
          },
        });

      for (const entry of animeEntries) {
        if (!entry.animeId) continue;

        let tvdbId: number | null = null;
        const connectionsObj = (entry.connections as Record<string, any>) || {};

        if (connectionsObj.tvdbId) {
          tvdbId = connectionsObj.tvdbId;
        } else {
          // Resolve using Fribb's mapping
          const resolvedId = await AnimeMappingCache.getTvdbId(entry.animeId);
          if (resolvedId) {
            tvdbId = resolvedId;

            // Cache in database
            try {
              await this.prisma.client.aquilaAnimeUserList.update({
                where: { id: entry.id },
                data: {
                  connections: {
                    ...connectionsObj,
                    tvdbId,
                  },
                },
              });
            } catch (dbErr) {
              this.logger.error(
                `Failed to save resolved anime TVDB ID for entry ${entry.id}:`,
                dbErr,
              );
            }
          }
        }

        if (tvdbId) {
          const title =
            entry.anime.titleEnglish ||
            entry.anime.titleRomaji ||
            'Unknown Anime';
          resultList.push({
            title,
            tvdbId,
            year: entry.anime.seasonYear || 0,
            monitored: true,
            seasons: [],
          });
        }
      }
    }

    return resultList;
  }

  public async exportRrList(username: string, types: string[]): Promise<any> {
    const exportData: any = { version: '1.0' };
    const normalizedUsername = username.toLowerCase();

    if (types.includes('anime')) {
      const entries = await this.prisma.client.aquilaAnimeUserList.findMany({
        where: { username: normalizedUsername },
        include: { anime: true },
      });
      exportData.anime = entries.map((entry) => ({
        status: entry.status,
        progress: entry.progress,
        score: entry.score,
        notes: entry.notes,
        rewatched: entry.rewatched,
        private: entry.private,
        startDate: entry.startDate,
        endDate: entry.endDate,
        connections: entry.connections,
        media: {
          anilistId: entry.anime.anilistId,
          malId: entry.anime.malId,
          titleRomaji: entry.anime.titleRomaji,
          titleEnglish: entry.anime.titleEnglish,
          coverImageLarge: entry.anime.coverImageLarge,
        },
      }));
    }

    if (types.includes('manga')) {
      const entries = await this.prisma.client.aquilaMangaUserList.findMany({
        where: { username: normalizedUsername },
        include: { manga: true },
      });
      exportData.manga = entries.map((entry) => ({
        status: entry.status,
        chapters: entry.chapters,
        volumes: entry.volumes,
        score: entry.score,
        notes: entry.notes,
        reread: entry.reread,
        private: entry.private,
        startDate: entry.startDate,
        endDate: entry.endDate,
        connections: entry.connections,
        media: {
          anilistId: entry.manga.anilistId,
          malId: entry.manga.malId,
          titleRomaji: entry.manga.titleRomaji,
          titleEnglish: entry.manga.titleEnglish,
          coverImageLarge: entry.manga.coverImageLarge,
        },
      }));
    }

    if (types.includes('tv')) {
      const entries = await this.prisma.client.aquilaTvUserList.findMany({
        where: { username: normalizedUsername },
        include: { tv: true, watchedEpisodes: true },
      });
      exportData.tv = entries.map((entry) => ({
        status: entry.status,
        score: entry.score,
        notes: entry.notes,
        rewatched: entry.rewatched,
        private: entry.private,
        startDate: entry.startDate,
        endDate: entry.endDate,
        connections: entry.connections,
        episodes: entry.watchedEpisodes.map((ep) => ({
          seasonNum: ep.seasonNum,
          episodeNum: ep.episodeNum,
        })),
        media: {
          tvdbId: entry.tv.tvdbId,
          titleRomaji: entry.tv.titleRomaji,
          titleEnglish: entry.tv.titleEnglish,
          coverImage: entry.tv.coverImage,
        },
      }));
    }

    if (types.includes('movie')) {
      const entries = await this.prisma.client.aquilaMovieUserList.findMany({
        where: { username: normalizedUsername },
        include: { movie: true },
      });
      exportData.movie = entries.map((entry) => ({
        status: entry.status,
        score: entry.score,
        notes: entry.notes,
        rewatched: entry.rewatched,
        private: entry.private,
        startDate: entry.startDate,
        endDate: entry.endDate,
        connections: entry.connections,
        media: {
          tvdbId: entry.movie.tvdbId,
          titleRomaji: entry.movie.titleRomaji,
          titleEnglish: entry.movie.titleEnglish,
          coverImage: entry.movie.coverImage,
        },
      }));
    }

    if (types.includes('game')) {
      const entries = await this.prisma.client.aquilaGameUserList.findMany({
        where: { username: normalizedUsername },
        include: { game: true },
      });
      exportData.game = entries.map((entry) => ({
        status: entry.status,
        progress: entry.progress,
        score: entry.score,
        notes: entry.notes,
        private: entry.private,
        startDate: entry.startDate,
        endDate: entry.endDate,
        media: {
          rawgId: entry.game.rawgId,
          titleString: entry.game.titleString,
          coverImage: entry.game.coverImage,
        },
      }));
    }

    if (types.includes('book')) {
      const entries = await this.prisma.client.aquilaBookUserList.findMany({
        where: { username: normalizedUsername },
        include: { book: true },
      });
      exportData.book = entries.map((entry) => ({
        status: entry.status,
        chapters: entry.chapters,
        volumes: entry.volumes,
        score: entry.score,
        notes: entry.notes,
        private: entry.private,
        startDate: entry.startDate,
        endDate: entry.endDate,
        media: {
          googleBookId: entry.book.googleBookId,
          titleString: entry.book.titleString,
          coverImage: entry.book.coverImage,
        },
      }));
    }

    return exportData;
  }

  public async exportMalXml(
    username: string,
    type: 'anime' | 'manga',
  ): Promise<string> {
    const normalizedUsername = username.toLowerCase();
    const formatDateForMal = (ts?: number | null) => {
      if (!ts) return '0000-00-00';
      const d = new Date(ts * 1000);
      if (isNaN(d.getTime())) return '0000-00-00';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    if (type === 'anime') {
      const entries = await this.prisma.client.aquilaAnimeUserList.findMany({
        where: { username: normalizedUsername },
        include: { anime: true },
      });

      const mapStatusToMal = (s: string) => {
        switch (s) {
          case 'WATCHING':
            return 'Watching';
          case 'COMPLETED':
            return 'Completed';
          case 'ON_HOLD':
            return 'On-Hold';
          case 'DROPPED':
            return 'Dropped';
          case 'PLANNING':
            return 'Plan to Watch';
          default:
            return 'Plan to Watch';
        }
      };

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<myanimelist>\n';
      xml += '  <myinfo>\n';
      xml += '    <user_id>0</user_id>\n';
      xml += `    <user_name>${username}</user_name>\n`;
      xml += '    <user_export_type>1</user_export_type>\n';
      xml += '  </myinfo>\n';

      for (const entry of entries) {
        if (!entry.anime) continue;
        const malId = entry.anime.malId || entry.anime.anilistId || '';
        const title = entry.anime.titleEnglish || entry.anime.titleRomaji || '';
        const malStatus = mapStatusToMal(entry.status);
        const startDateFormatted = formatDateForMal(entry.startDate);
        const endDateFormatted = formatDateForMal(entry.endDate);

        xml += '  <anime>\n';
        xml += `    <series_animedb_id>${malId}</series_animedb_id>\n`;
        xml += `    <series_title><![CDATA[${title}]]></series_title>\n`;
        xml += `    <my_id>0</my_id>\n`;
        xml += `    <my_watched_episodes>${entry.progress || 0}</my_watched_episodes>\n`;
        xml += `    <my_start_date>${startDateFormatted}</my_start_date>\n`;
        xml += `    <my_finish_date>${endDateFormatted}</my_finish_date>\n`;
        xml += `    <my_score>${entry.score || 0}</my_score>\n`;
        xml += `    <my_status>${malStatus}</my_status>\n`;
        xml += `    <my_comments><![CDATA[${entry.notes || ''}]]></my_comments>\n`;
        xml += `    <my_times_watched>${entry.rewatched || 0}</my_times_watched>\n`;
        xml += `    <update_on_import>1</update_on_import>\n`;
        xml += '  </anime>\n';
      }
      xml += '</myanimelist>\n';
      return xml;
    } else {
      const entries = await this.prisma.client.aquilaMangaUserList.findMany({
        where: { username: normalizedUsername },
        include: { manga: true },
      });

      const mapStatusToMal = (s: string) => {
        switch (s) {
          case 'READING':
            return 'Reading';
          case 'COMPLETED':
            return 'Completed';
          case 'ON_HOLD':
            return 'On-Hold';
          case 'DROPPED':
            return 'Dropped';
          case 'PLANNING':
            return 'Plan to Read';
          default:
            return 'Plan to Read';
        }
      };

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<myanimelist>\n';
      xml += '  <myinfo>\n';
      xml += '    <user_id>0</user_id>\n';
      xml += `    <user_name>${username}</user_name>\n`;
      xml += '    <user_export_type>2</user_export_type>\n';
      xml += '  </myinfo>\n';

      for (const entry of entries) {
        if (!entry.manga) continue;
        const malId = entry.manga.malId || entry.manga.anilistId || '';
        const title = entry.manga.titleEnglish || entry.manga.titleRomaji || '';
        const malStatus = mapStatusToMal(entry.status);
        const startDateFormatted = formatDateForMal(entry.startDate);
        const endDateFormatted = formatDateForMal(entry.endDate);

        xml += '  <manga>\n';
        xml += `    <series_mangadb_id>${malId}</series_mangadb_id>\n`;
        xml += `    <series_title><![CDATA[${title}]]></series_title>\n`;
        xml += `    <my_id>0</my_id>\n`;
        xml += `    <my_read_chapters>${entry.chapters || 0}</my_read_chapters>\n`;
        xml += `    <my_read_volumes>${entry.volumes || 0}</my_read_volumes>\n`;
        xml += `    <my_start_date>${startDateFormatted}</my_start_date>\n`;
        xml += `    <my_finish_date>${endDateFormatted}</my_finish_date>\n`;
        xml += `    <my_score>${entry.score || 0}</my_score>\n`;
        xml += `    <my_status>${malStatus}</my_status>\n`;
        xml += `    <my_comments><![CDATA[${entry.notes || ''}]]></my_comments>\n`;
        xml += `    <my_times_read>${entry.reread || 0}</my_times_read>\n`;
        xml += `    <update_on_import>1</update_on_import>\n`;
        xml += '  </manga>\n';
      }
      xml += '</myanimelist>\n';
      return xml;
    }
  }

  public async startImport(
    username: string,
    payload: any,
  ): Promise<{ success: boolean; message: string }> {
    const userId = await this.getUserId(username);
    void this.importRrListInBackground(userId, username, payload);
    return { success: true, message: 'Import started in the background.' };
  }

  private async importRrListInBackground(
    userId: string,
    username: string,
    payload: any,
  ): Promise<void> {
    this.logger.log(`Starting background list import for user ${username}`);
    let successCount = 0;
    let failureCount = 0;

    // 1. Anime
    if (payload.anime && Array.isArray(payload.anime)) {
      for (const item of payload.anime) {
        try {
          if (!item.media || (!item.media.anilistId && !item.media.malId)) {
            failureCount++;
            continue;
          }
          const anilistId = item.media.anilistId ?? item.media.malId;
          const media = await this.animeService.ensureAnime(
            anilistId,
            item.media.malId,
            item.media.titleRomaji || item.media.titleEnglish,
            item.media.coverImageLarge,
          );
          await this.upsertAnimeList(username, {
            animeId: media.id,
            status: item.status,
            progress: item.progress,
            score: item.score,
            startDate: item.startDate,
            endDate: item.endDate,
            notes: item.notes,
            rewatched: item.rewatched,
            connections: item.connections,
          });
          successCount++;
        } catch (err) {
          this.logger.error(
            `Import anime entry failed for user ${username}:`,
            err,
          );
          failureCount++;
        }
      }
    }

    // 2. Manga
    if (payload.manga && Array.isArray(payload.manga)) {
      for (const item of payload.manga) {
        try {
          if (!item.media || (!item.media.anilistId && !item.media.malId)) {
            failureCount++;
            continue;
          }
          const anilistId = item.media.anilistId ?? item.media.malId;
          const media = await this.mangaService.ensureManga(
            anilistId,
            item.media.malId,
            item.media.titleRomaji || item.media.titleEnglish,
            item.media.coverImageLarge,
          );
          await this.upsertMangaList(username, {
            mangaId: media.id,
            status: item.status,
            chapters: item.chapters,
            volumes: item.volumes,
            score: item.score,
            startDate: item.startDate,
            endDate: item.endDate,
            notes: item.notes,
            reread: item.reread,
            connections: item.connections,
          });
          successCount++;
        } catch (err) {
          this.logger.error(
            `Import manga entry failed for user ${username}:`,
            err,
          );
          failureCount++;
        }
      }
    }

    // 3. TV
    if (payload.tv && Array.isArray(payload.tv)) {
      for (const item of payload.tv) {
        try {
          if (!item.media || !item.media.tvdbId) {
            failureCount++;
            continue;
          }
          const media = await this.tvService.ensureTv(
            item.media.tvdbId,
            item.media.titleEnglish || item.media.titleRomaji,
            item.media.coverImage,
          );
          await this.upsertTvList(username, {
            tvId: media.id,
            status: item.status,
            score: item.score,
            startDate: item.startDate,
            endDate: item.endDate,
            notes: item.notes,
            rewatched: item.rewatched,
            connections: item.connections,
            episodes: item.episodes,
          });
          successCount++;
        } catch (err) {
          this.logger.error(
            `Import TV entry failed for user ${username}:`,
            err,
          );
          failureCount++;
        }
      }
    }

    // 4. Movie
    if (payload.movie && Array.isArray(payload.movie)) {
      for (const item of payload.movie) {
        try {
          if (!item.media || !item.media.tvdbId) {
            failureCount++;
            continue;
          }
          const media = await this.movieService.ensureMovie(
            item.media.tvdbId,
            item.media.titleEnglish || item.media.titleRomaji,
            item.media.coverImage,
          );
          await this.upsertMovieList(username, {
            movieId: media.id,
            status: item.status,
            score: item.score,
            startDate: item.startDate,
            endDate: item.endDate,
            notes: item.notes,
            rewatched: item.rewatched,
            connections: item.connections,
          });
          successCount++;
        } catch (err) {
          this.logger.error(
            `Import Movie entry failed for user ${username}:`,
            err,
          );
          failureCount++;
        }
      }
    }

    // 5. Game
    if (payload.game && Array.isArray(payload.game)) {
      for (const item of payload.game) {
        try {
          if (!item.media || !item.media.rawgId) {
            failureCount++;
            continue;
          }
          const media = await this.gameService.ensureGame(
            item.media.rawgId,
            item.media.titleString,
            item.media.coverImage,
          );
          await this.upsertGameList(username, {
            gameId: media.id,
            status: item.status,
            progress: item.progress,
            score: item.score,
            startDate: item.startDate,
            endDate: item.endDate,
            notes: item.notes,
          });
          successCount++;
        } catch (err) {
          this.logger.error(
            `Import Game entry failed for user ${username}:`,
            err,
          );
          failureCount++;
        }
      }
    }

    // 6. Book
    if (payload.book && Array.isArray(payload.book)) {
      for (const item of payload.book) {
        try {
          if (!item.media || !item.media.googleBookId) {
            failureCount++;
            continue;
          }
          const media = await this.bookService.ensureBook(
            item.media.googleBookId,
            item.media.titleString,
            item.media.coverImage,
          );
          await this.upsertBookList(username, {
            bookId: String(media.id),
            status: item.status,
            chapters: item.chapters,
            volumes: item.volumes,
            score: item.score,
            startDate: item.startDate,
            endDate: item.endDate,
            notes: item.notes,
          });
          successCount++;
        } catch (err) {
          this.logger.error(
            `Import Book entry failed for user ${username}:`,
            err,
          );
          failureCount++;
        }
      }
    }

    this.logger.log(
      `Completed list import for user ${username}. Success: ${successCount}, Failed: ${failureCount}`,
    );

    try {
      await this.notificationService.create(userId, {
        title: 'Media Lists Import Complete',
        message: `Successfully imported ${successCount} entries (${failureCount} failed).`,
        type: 'INFO',
      });
    } catch (notifErr) {
      this.logger.error(
        `Failed to send list import notification for user ${username}:`,
        notifErr,
      );
    }
  }
}
