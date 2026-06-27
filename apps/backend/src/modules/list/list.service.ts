import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';

import { parsePrivacy } from '../user/user.service';

import { $Enums } from '@runa/database';
import { MovieUpdateData, TvUpdateData } from '@runa/connections';

import { PrismaService } from '../../providers/database/prisma.service';
import { StatsService } from '../stats/stats.service';
import { ConnectionsManager } from './connections/connections.manager';
import ListEntity from './entities/ListEntity';

export interface ListQueryOptions {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  format?: string;
  sort?: string;
}

@Injectable()
export class ListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionsManager: ConnectionsManager,
    private readonly statsService: StatsService,
  ) {}

  private readonly logger = new Logger(ListService.name);

  private async getUserId(username: string): Promise<string> {
    const user = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`User ${username} not found`);
    return user.id;
  }

  private getPrismaStatus<T>(status: string | undefined, enumObj: any): T | undefined {
    if (!status || status.toLowerCase() === 'all') return undefined;
    let normalized = status.toUpperCase().trim();
    if (normalized.endsWith('TV') && normalized.length > 2) {
      const charBeforeTV = normalized.charAt(normalized.length - 3);
      if (charBeforeTV === ' ' || charBeforeTV === '\t' || charBeforeTV === '\r' || charBeforeTV === '\n') {
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
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.animeList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.AnimeListStatus>(
      query?.status,
      $Enums.AnimeListStatus,
    );
    const search = query?.search?.trim();
    const format = query?.format?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (format || search) {
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

    if (!out) throw new NotFoundException('Anime not found in list');
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

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections)) {
          const conn = entry.connections[providerKey];
          if (!conn) continue;
          const providerId = typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager.deleteAnime(providerKey, username.toLowerCase(), providerId)
              .catch((err) => this.logger.error(`Failed to delete anime connection for provider ${providerKey}`, err));
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
        if (conn.rewatched !== undefined) connRewatched = Number(conn.rewatched);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      await this.connectionsManager.syncAnime(providerKey, username, providerId, {
        status: connStatus,
        progress: connProgress,
        score: connScore,
        startDate: connStartDate,
        endDate: connEndDate,
        notes: connNotes,
        rewatched: connRewatched,
      }).catch((err) => this.logger.error(`Failed to sync anime with ${providerKey}`, err));
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
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.mangaList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.MangaListStatus>(
      query?.status,
      $Enums.MangaListStatus,
    );
    const search = query?.search?.trim();
    const format = query?.format?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (format || search) {
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

    if (!out) throw new NotFoundException('Manga not found in list');
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

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections)) {
          const conn = entry.connections[providerKey];
          if (!conn) continue;
          const providerId = typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager.deleteManga(providerKey, username.toLowerCase(), providerId)
              .catch((err) => this.logger.error(`Failed to delete manga connection for provider ${providerKey}`, err));
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

      await this.connectionsManager.syncManga(providerKey, username, providerId, {
        status: connStatus,
        chapters: connChapters,
        volumes: connVolumes,
        score: connScore,
        startDate: connStartDate,
        endDate: connEndDate,
        notes: connNotes,
        reread: connReread,
      }).catch((err) => this.logger.error(`Failed to sync manga with ${providerKey}`, err));
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
        if (conn.rewatched !== undefined) connRewatched = Number(conn.rewatched);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      await this.connectionsManager.syncMovie(providerKey, username, providerId, {
        status: connStatus,
        score: connScore,
        startDate: connStartDate,
        endDate: connEndDate,
        notes: connNotes,
        rewatched: connRewatched,
      }).catch((err) => this.logger.error(`Failed to sync movie with ${providerKey}`, err));
    }
  }

  private async updateTvConnections(
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

    // Fetch watched episodes to sync progress
    const listEntry = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
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
        if (conn.rewatched !== undefined) connRewatched = Number(conn.rewatched);
      } else {
        providerId = Number(conn);
      }

      if (Number.isNaN(providerId) || providerId <= 0) continue;

      await this.connectionsManager.syncTv(providerKey, username, providerId, {
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
      }).catch((err) => this.logger.error(`Failed to sync TV show with ${providerKey}`, err));
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
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.movieList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.MovieListStatus>(
      query?.status,
      $Enums.MovieListStatus,
    );
    const search = query?.search?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search) {
      whereClause.movie = {
        OR: [
          { titleEnglish: { contains: search, mode: 'insensitive' } },
          { titleRomaji: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [list, counts] = await Promise.all([
      this.prisma.client.aquilaMovieUserList.findMany({
        where: whereClause,
        take: query?.limit ?? 30,
        skip: query?.offset ?? 0,
        orderBy: this.getMovieOrderBy(query?.sort),
        select: {
          tvdbId: true,
          status: true,
          score: true,
          updatedAt: true,
          createdAt: true,
          movie: {
            select: {
              titleEnglish: true,
              titleRomaji: true,
              coverImage: true,
            },
          },
        },
      }),
      this.getStatusCounts(this.prisma.client.aquilaMovieUserList, username),
    ]);

    const mappedList: ListEntity[] = list.map((item) => ({
      id: item.tvdbId,
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
    }));

    return { entries: mappedList, counts };
  }

  public async getMovieListEntry(username: string, tvdbId: number) {
    const out = await this.prisma.client.aquilaMovieUserList.findUnique({
      where: {
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
        },
      },
    });

    if (!out) throw new NotFoundException('Movie not found in list');
    return out;
  }

  public async upsertMovieList(
    username: string,
    body: {
      tvdbId: number;
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

      await this.prisma.client.aquilaMovieUserList.upsert({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId: body.tvdbId,
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
          tvdbId: body.tvdbId,
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
          body.tvdbId,
          body.connections || {},
          body.status,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.rewatched,
        );
      }
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
    tvdbId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaMovieUserList.findUnique({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId,
          },
        },
      });

      await this.prisma.client.aquilaMovieUserList.delete({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId,
          },
        },
      });

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections)) {
          const conn = entry.connections[providerKey];
          if (!conn) continue;
          const providerId = typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager.deleteMovie(providerKey, username.toLowerCase(), providerId)
              .catch((err) => this.logger.error(`Failed to delete movie connection for provider ${providerKey}`, err));
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
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.tvList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.TvListStatus>(
      query?.status,
      $Enums.TvListStatus,
    );
    const search = query?.search?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search) {
      whereClause.tv = {
        OR: [
          { titleEnglish: { contains: search, mode: 'insensitive' } },
          { titleRomaji: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [list, counts] = await Promise.all([
      this.prisma.client.aquilaTvUserList.findMany({
        where: whereClause,
        take: query?.limit ?? 30,
        skip: query?.offset ?? 0,
        orderBy: this.getTvOrderBy(query?.sort),
        select: {
          tvdbId: true,
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
        id: item.tvdbId,
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
      };
    });

    return { entries: mappedList, counts };
  }

  public async getTvListEntry(username: string, tvdbId: number) {
    const out = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
        },
      },
      include: {
        watchedEpisodes: true,
      },
    });

    if (!out) throw new NotFoundException('TV show not found in list');
    return out;
  }

  public async upsertTvList(
    username: string,
    body: {
      tvdbId: number;
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

      const listEntry = await this.prisma.client.aquilaTvUserList.upsert({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId: body.tvdbId,
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
          tvdbId: body.tvdbId,
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
          body.tvdbId,
          body.connections || {},
          body.status,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.rewatched,
        );
      }
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
    tvdbId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      const entry = await this.prisma.client.aquilaTvUserList.findUnique({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId,
          },
        },
      });

      await this.prisma.client.aquilaTvUserList.delete({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId,
          },
        },
      });

      if (entry && entry.connections && typeof entry.connections === 'object') {
        for (const providerKey of Object.keys(entry.connections)) {
          const conn = entry.connections[providerKey];
          if (!conn) continue;
          const providerId = typeof conn === 'object' ? Number(conn.id) : Number(conn);
          if (!Number.isNaN(providerId) && providerId > 0) {
            await this.connectionsManager.deleteTv(providerKey, username.toLowerCase(), providerId)
              .catch((err) => this.logger.error(`Failed to delete TV connection for provider ${providerKey}`, err));
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
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
        },
      },
    });

    if (!listEntry) throw new NotFoundException('TV show not in list');

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
      ).catch((err) => this.logger.error('Failed to sync toggled episode tv connection', err));
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
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
        },
      },
    });

    if (!listEntry) throw new NotFoundException('TV show not in list');

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
      ).catch((err) => this.logger.error('Failed to sync toggled season tv connection', err));
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
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.gameList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.GameListStatus>(
      query?.status,
      $Enums.GameListStatus,
    );
    const search = query?.search?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search) {
      whereClause.game = {
        titleString: { contains: search, mode: 'insensitive' },
      };
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

    if (!out) throw new NotFoundException('Game not found in list');
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
      await this.prisma.client.aquilaGameUserList.delete({
        where: {
          username_gameId: {
            username: username.toLowerCase(),
            gameId,
          },
        },
      });

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
      throw new NotFoundException(`User ${username} not found`);
    }

    const isOwner = requester?.toLowerCase() === username.toLowerCase();
    const privacy = parsePrivacy(owner.privacy);
    if ((privacy.profile || privacy.bookList) && !isOwner) {
      throw new ForbiddenException('This list is private');
    }

    const statusEnum = this.getPrismaStatus<$Enums.BookListStatus>(
      query?.status,
      $Enums.BookListStatus,
    );
    const search = query?.search?.trim();

    const whereClause: any = {
      username: username.toLowerCase(),
      ...(statusEnum ? { status: statusEnum } : {}),
    };

    if (search) {
      whereClause.book = {
        titleString: { contains: search, mode: 'insensitive' },
      };
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
    }));

    return { entries: mappedList, counts };
  }

  public async getBookListEntry(username: string, bookId: string) {
    const out = await this.prisma.client.aquilaBookUserList.findUnique({
      where: {
        username_bookId: {
          username: username.toLowerCase(),
          bookId,
        },
      },
    });

    if (!out) throw new NotFoundException('Book not found in list');
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

      await this.prisma.client.aquilaBookUserList.upsert({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId: body.bookId,
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
          bookId: body.bookId,
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
      await this.prisma.client.aquilaBookUserList.delete({
        where: {
          username_bookId: {
            username: username.toLowerCase(),
            bookId,
          },
        },
      });

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
        id: item.tvdbId,
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
      if (isNaN(gameIdNum)) throw new Error('Invalid game ID');
      const entry = await this.prisma.client.aquilaGameUserList.findUnique({
        where: { username_gameId: { username: user, gameId: gameIdNum } },
      });
      if (!entry) throw new NotFoundException('Game not in list');

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
      if (!entry) throw new NotFoundException('Book not in list');

      const nextProgress = (entry.chapters || 0) + countVal;
      const isCompleted = !!(entry.book.chapters && nextProgress >= entry.book.chapters);

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
      if (isNaN(animeIdNum)) throw new Error('Invalid anime ID');
      const entry = await this.prisma.client.aquilaAnimeUserList.findUnique({
        where: { username_animeId: { username: user, animeId: animeIdNum } },
        include: { anime: true },
      });
      if (!entry) throw new NotFoundException('Anime not in list');

      const nextProgress = (entry.progress || 0) + countVal;
      const isCompleted =
        entry.anime.episodes && nextProgress >= entry.anime.episodes;

      let connectionsData = entry.connections as any;
      let nextConnections = connectionsData;
      if (connectionsData && typeof connectionsData === 'object' && !Array.isArray(connectionsData)) {
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
          isCompleted ? Math.floor(Date.now() / 1000) : (entry.endDate || undefined),
          entry.notes || undefined,
          entry.rewatched || undefined,
        ).catch((err) => this.logger.error('Failed to sync incremented anime connection', err));
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'anime');

      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'manga') {
      const mangaIdNum = Number(id);
      if (isNaN(mangaIdNum)) throw new Error('Invalid manga ID');
      const entry = await this.prisma.client.aquilaMangaUserList.findUnique({
        where: { username_mangaId: { username: user, mangaId: mangaIdNum } },
        include: { manga: true },
      });
      if (!entry) throw new NotFoundException('Manga not in list');

      const nextProgress = (entry.chapters || 0) + countVal;
      const isCompleted =
        entry.manga.chapters && nextProgress >= entry.manga.chapters;

      let connectionsData = entry.connections as any;
      let nextConnections = connectionsData;
      if (connectionsData && typeof connectionsData === 'object' && !Array.isArray(connectionsData)) {
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
          isCompleted ? Math.floor(Date.now() / 1000) : (entry.endDate || undefined),
          entry.notes || undefined,
          entry.reread || undefined,
        ).catch((err) => this.logger.error('Failed to sync incremented manga connection', err));
      }

      const userId = await this.getUserId(username);
      void this.statsService.recalculate(userId, 'manga');

      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'tv') {
      const tvdbIdNum = Number(id);
      if (isNaN(tvdbIdNum)) throw new Error('Invalid TVDB ID');
      const entry = await this.prisma.client.aquilaTvUserList.findUnique({
        where: { username_tvdbId: { username: user, tvdbId: tvdbIdNum } },
        include: { tv: true, watchedEpisodes: true },
      });
      if (!entry) throw new NotFoundException('TV show not in list');

      const seasons = (entry.tv.seasons as any[]) || [];
      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodeCount || 0),
        0,
      );

      // Find the next count episodes to watch
      let nextEps: { seasonNum: number; episodeNum: number }[] = [];

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
          isCompleted ? Math.floor(Date.now() / 1000) : (entry.endDate || undefined),
          entry.notes || undefined,
          entry.rewatched || undefined,
        ).catch((err) => this.logger.error('Failed to sync incremented tv connection', err));
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
}
