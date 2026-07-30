import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type User } from '@runa/database';
import { PrismaService } from '../../providers/database/prisma.service';

// ---------------------------------------------------------------------------
// Types for the raw list entry shapes returned by Prisma queries
// ---------------------------------------------------------------------------

export interface AnimeListEntry {
  progress: number | null;
  score: number | null;
  status: string;
  anime: {
    episodes: number | null;
    duration: number | null;
    format: string | null;
    countryOfOrigin: string | null;
  } | null;
}

export interface MangaListEntry {
  chapters: number | null;
  volumes: number | null;
  score: number | null;
  status: string;
  manga: {
    chapters: number | null;
    volumes: number | null;
    format: string | null;
    countryOfOrigin: string | null;
  } | null;
}

export interface TvListEntry {
  score: number | null;
  status: string;
  tv: {
    averageRuntime: number | null;
    originalCountry: string | null;
  } | null;
  watchedEpisodes: { id: number }[];
}

export interface MovieListEntry {
  score: number | null;
  status: string;
  movie: {
    runtime: number | null;
    originalCountry: string | null;
  } | null;
}

export interface GameListEntry {
  progress: number | null;
  score: number | null;
  status: string;
  game: {
    platforms: string[];
    genres: string[];
  } | null;
}

export interface BookListEntry {
  chapters: number | null;
  volumes: number | null;
  score: number | null;
  status: string;
  book: {
    pages: number | null;
  } | null;
}

export interface UserWithPrivacy {
  id: string;
  username: string;
  privacy: Prisma.JsonValue;
}

export interface UserStatRecord {
  statsData: Prisma.JsonValue;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly moduleCode = 'SsRpstry-';
  private readonly logger = new Logger(StatsRepository.name);

  public async findUserByUsername(
    username: string,
  ): Promise<UserWithPrivacy | null> {
    return this.prisma.client.user.findUnique({
      where: { username },
      select: { id: true, username: true, privacy: true },
    });
  }

  public async findUserById(
    userId: string,
  ): Promise<{ id: string; username: string } | null> {
    return this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
  }

  public async findUserStats(
    userId: string,
    mediaType: string,
  ): Promise<UserStatRecord | null> {
    return this.prisma.client.userStats.findUnique({
      where: {
        userId_mediaType: { userId, mediaType },
      },
      select: { statsData: true },
    });
  }

  public async upsertUserStats(
    userId: string,
    mediaType: string,
    statsData: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.client.userStats.upsert({
      where: {
        userId_mediaType: { userId, mediaType },
      },
      create: { userId, mediaType, statsData },
      update: { statsData },
    });
  }

  // --- List queries for each V2 media type ---

  public async findAnimeList(username: string): Promise<AnimeListEntry[]> {
    const list = await this.prisma.client.aquilaAnimeUserListV2.findMany({
      where: { username },
      select: {
        progress: true,
        score: true,
        status: true,
        anime: {
          select: {
            episodeCount: true,
            episodeDuration: true,
            format: true,
            countryOfOrigin: true,
          },
        },
      },
    });

    return list.map((item) => ({
      progress: item.progress,
      score: item.score,
      status: item.status,
      anime: item.anime
        ? {
            episodes: item.anime.episodeCount,
            duration: item.anime.episodeDuration,
            format: item.anime.format,
            countryOfOrigin: item.anime.countryOfOrigin,
          }
        : null,
    }));
  }

  public async findMangaList(username: string): Promise<MangaListEntry[]> {
    const list = await this.prisma.client.aquilaMangaUserListV2.findMany({
      where: { username },
      select: {
        chaptersProgress: true,
        volumesProgress: true,
        score: true,
        status: true,
        manga: {
          select: {
            chapterCount: true,
            volumeCount: true,
            format: true,
            countryOfOrigin: true,
          },
        },
      },
    });

    return list.map((item) => ({
      chapters: item.chaptersProgress,
      volumes: item.volumesProgress,
      score: item.score,
      status: item.status,
      manga: item.manga
        ? {
            chapters: item.manga.chapterCount,
            volumes: item.manga.volumeCount,
            format: item.manga.format,
            countryOfOrigin: item.manga.countryOfOrigin,
          }
        : null,
    }));
  }

  public async findTvList(username: string): Promise<TvListEntry[]> {
    const list = await this.prisma.client.aquilaTvUserListV2.findMany({
      where: { username },
      select: {
        score: true,
        status: true,
        tv: {
          select: {
            averageRuntime: true,
            countryOfOrigin: true,
          },
        },
        watchedEpisodes: {
          select: { id: true },
        },
      },
    });

    return list.map((item) => ({
      score: item.score,
      status: item.status,
      tv: item.tv
        ? {
            averageRuntime: item.tv.averageRuntime,
            originalCountry: item.tv.countryOfOrigin,
          }
        : null,
      watchedEpisodes: item.watchedEpisodes,
    }));
  }

  public async findMovieList(username: string): Promise<MovieListEntry[]> {
    const list = await this.prisma.client.aquilaMovieUserListV2.findMany({
      where: { username },
      select: {
        score: true,
        status: true,
        movie: {
          select: {
            runtime: true,
            countryOfOrigin: true,
          },
        },
      },
    });

    return list.map((item) => ({
      score: item.score,
      status: item.status,
      movie: item.movie
        ? {
            runtime: item.movie.runtime,
            originalCountry: item.movie.countryOfOrigin,
          }
        : null,
    }));
  }

  public async findGameList(username: string): Promise<GameListEntry[]> {
    const list = await this.prisma.client.aquilaGameUserListV2.findMany({
      where: { username },
      select: {
        progress: true,
        score: true,
        status: true,
        game: {
          select: {
            platforms: true,
            genres: true,
          },
        },
      },
    });

    return list.map((item) => ({
      progress: item.progress,
      score: item.score,
      status: item.status,
      game: item.game
        ? {
            platforms: item.game.platforms,
            genres: item.game.genres,
          }
        : null,
    }));
  }

  public async findBookList(username: string): Promise<BookListEntry[]> {
    const list = await this.prisma.client.aquilaBookUserListV2.findMany({
      where: { username },
      select: {
        progressChapters: true,
        progressVolumes: true,
        score: true,
        status: true,
        book: {
          select: {
            pageCount: true,
          },
        },
      },
    });

    return list.map((item) => ({
      chapters: item.progressChapters,
      volumes: item.progressVolumes,
      score: item.score,
      status: item.status,
      book: item.book
        ? {
            pages: item.book.pageCount,
          }
        : null,
    }));
  }
}
