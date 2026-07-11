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
  watchedEpisodes: { id: string }[];
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

  // --- List queries for each media type ---

  public async findAnimeList(username: string): Promise<AnimeListEntry[]> {
    return this.prisma.client.aquilaAnimeUserList.findMany({
      where: { username },
      select: {
        progress: true,
        score: true,
        status: true,
        anime: {
          select: {
            episodes: true,
            duration: true,
            format: true,
            countryOfOrigin: true,
          },
        },
      },
    });
  }

  public async findMangaList(username: string): Promise<MangaListEntry[]> {
    return this.prisma.client.aquilaMangaUserList.findMany({
      where: { username },
      select: {
        chapters: true,
        volumes: true,
        score: true,
        status: true,
        manga: {
          select: {
            chapters: true,
            volumes: true,
            format: true,
            countryOfOrigin: true,
          },
        },
      },
    });
  }

  public async findTvList(username: string): Promise<TvListEntry[]> {
    return this.prisma.client.aquilaTvUserList.findMany({
      where: { username },
      select: {
        score: true,
        status: true,
        tv: {
          select: {
            averageRuntime: true,
            originalCountry: true,
          },
        },
        watchedEpisodes: {
          select: { id: true },
        },
      },
    }) as unknown as TvListEntry[];
  }

  public async findMovieList(username: string): Promise<MovieListEntry[]> {
    return this.prisma.client.aquilaMovieUserList.findMany({
      where: { username },
      select: {
        score: true,
        status: true,
        movie: {
          select: {
            runtime: true,
            originalCountry: true,
          },
        },
      },
    });
  }

  public async findGameList(username: string): Promise<GameListEntry[]> {
    return this.prisma.client.aquilaGameUserList.findMany({
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
  }

  public async findBookList(username: string): Promise<BookListEntry[]> {
    return this.prisma.client.aquilaBookUserList.findMany({
      where: { username },
      select: {
        chapters: true,
        volumes: true,
        score: true,
        status: true,
        book: {
          select: {
            pages: true,
          },
        },
      },
    });
  }
}
