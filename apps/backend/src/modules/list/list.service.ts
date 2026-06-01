import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { $Enums } from '@runa/database';

import { PrismaService } from '../../providers/database/prisma.service';
import { ConnectionsManager } from './connections/connections.manager';
import ListEntity from './entities/ListEntity';

@Injectable()
export class ListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionsManager: ConnectionsManager,
  ) {}

  private readonly logger = new Logger(ListService.name);

  public async getAnimeList(username: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaAnimeUserList.findMany({
      where: {
        username: username.toLowerCase(),
      },
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
    });

    if (!list.length) {
      return [];
    }

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

    return mappedList;
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
      await this.prisma.client.aquilaAnimeUserList.delete({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
      });
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

  public async getMangaList(username: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaMangaUserList.findMany({
      where: { username: username.toLowerCase() },
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
    });

    if (!list.length) {
      return [];
    }

    return list.map((item) => ({
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
  }

  public async getMangaListEntry(username: string, mangaId: number) {
    return this.prisma.client.aquilaMangaUserList.findUnique({
      where: {
        username_mangaId: {
          username: username.toLowerCase(),
          mangaId,
        },
      },
    });
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
      await this.prisma.client.aquilaMangaUserList.delete({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
      });
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

  // ─────────────────────────── MOVIE ───────────────────────────

  public async getMovieList(username: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaMovieUserList.findMany({
      where: {
        username: username.toLowerCase(),
      },
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
    });

    if (!list.length) {
      return [];
    }

    return list.map((item) => ({
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
      connections?: any;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
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
        },
      });
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update movie list',
        error: error,
      };
    }

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
      await this.prisma.client.aquilaMovieUserList.delete({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId,
          },
        },
      });
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

  public async getTvList(username: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaTvUserList.findMany({
      where: {
        username: username.toLowerCase(),
      },
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
    });

    if (!list.length) {
      return [];
    }

    return list.map((item) => {
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
      connections?: any;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaTvUserList.upsert({
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
        },
      });
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update TV list',
        error: error,
      };
    }

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
      await this.prisma.client.aquilaTvUserList.delete({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId,
          },
        },
      });
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

    if (existing) {
      await this.prisma.client.aquilaTvWatchedEpisode.delete({
        where: { id: existing.id },
      });
      return { watched: false };
    } else {
      await this.prisma.client.aquilaTvWatchedEpisode.create({
        data: {
          listId: listEntry.id,
          seasonNum,
          episodeNum,
        },
      });
      return { watched: true };
    }
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

    return { success: true };
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

      // Find the "current" season/episode display
      // We look for the latest watched episode to show current progress
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

    return watchingList.sort(
      (a, b) => b.last_updated.getTime() - a.last_updated.getTime(),
    );
  }

  public async incrementProgress(
    username: string,
    mediaType: 'anime' | 'manga' | 'tv',
    id: number,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const user = username.toLowerCase();

    if (mediaType === 'anime') {
      const entry = await this.prisma.client.aquilaAnimeUserList.findUnique({
        where: { username_animeId: { username: user, animeId: id } },
        include: { anime: true },
      });
      if (!entry) throw new NotFoundException('Anime not in list');

      const nextProgress = (entry.progress || 0) + 1;
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
                progress: (Number(conn.progress) || 0) + 1,
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
          id,
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

      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'manga') {
      const entry = await this.prisma.client.aquilaMangaUserList.findUnique({
        where: { username_mangaId: { username: user, mangaId: id } },
        include: { manga: true },
      });
      if (!entry) throw new NotFoundException('Manga not in list');

      const nextProgress = (entry.chapters || 0) + 1;
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
                chapters: (Number(conn.chapters) || 0) + 1,
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
          id,
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

      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'tv') {
      const entry = await this.prisma.client.aquilaTvUserList.findUnique({
        where: { username_tvdbId: { username: user, tvdbId: id } },
        include: { tv: true, watchedEpisodes: true },
      });
      if (!entry) throw new NotFoundException('TV show not in list');

      const seasons = (entry.tv.seasons as any[]) || [];
      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodeCount || 0),
        0,
      );

      // Find the next episode to watch
      let nextEp: { seasonNum: number; episodeNum: number } | null = null;

      for (const season of seasons) {
        for (const ep of season.episodes) {
          const isWatched = entry.watchedEpisodes.some(
            (we) =>
              we.seasonNum === season.number && we.episodeNum === ep.number,
          );
          if (!isWatched) {
            nextEp = { seasonNum: season.number, episodeNum: ep.number };
            break;
          }
        }
        if (nextEp) break;
      }

      if (!nextEp) {
        return { success: false, message: 'All episodes already watched' };
      }

      await this.prisma.client.aquilaTvWatchedEpisode.create({
        data: {
          listId: entry.id,
          seasonNum: nextEp.seasonNum,
          episodeNum: nextEp.episodeNum,
        },
      });

      const totalWatched = entry.watchedEpisodes.length + 1;
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

      return {
        success: true,
        message: 'Progress updated',
        data: { nextEp, isCompleted },
      };
    }

    return { success: false, message: 'Invalid media type' };
  }
}
