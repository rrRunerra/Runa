import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@runa/database';
import { PrismaService } from '../../providers/database/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(StatsService.name);
  private debounceTimeouts = new Map<string, NodeJS.Timeout>();

  public async recalculate(userId: string, mediaType: string): Promise<void> {
    const key = `${userId}-${mediaType}`;
    if (this.debounceTimeouts.has(key)) {
      clearTimeout(this.debounceTimeouts.get(key)!);
    }
    const timeout = setTimeout(() => {
      this.debounceTimeouts.delete(key);
      this.doRecalculate(userId, mediaType).catch((err: Error) => {
        this.logger.error(`Error recalculating stats for ${key}: ${err.message}`, err.stack);
      });
    }, 5000);
    this.debounceTimeouts.set(key, timeout);
  }

  public async doRecalculate(userId: string, mediaType: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const username = user.username.toLowerCase();
    let statsData: Prisma.InputJsonValue = {};

    switch (mediaType.toLowerCase()) {
      case 'anime':
        statsData = await this.calculateAnimeStats(username);
        break;
      case 'manga':
        statsData = await this.calculateMangaStats(username);
        break;
      case 'tv':
        statsData = await this.calculateTvStats(username);
        break;
      case 'movie':
        statsData = await this.calculateMovieStats(username);
        break;
      case 'game':
        statsData = await this.calculateGameStats(username);
        break;
      case 'book':
        statsData = await this.calculateBookStats(username);
        break;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }

    await this.prisma.client.userStats.upsert({
      where: {
        userId_mediaType: {
          userId: user.id,
          mediaType: mediaType.toLowerCase(),
        },
      },
      create: {
        userId: user.id,
        mediaType: mediaType.toLowerCase(),
        statsData,
      },
      update: {
        statsData,
      },
    });

    this.logger.log(`Successfully updated ${mediaType} stats cache for user ${user.username}`);
  }

  private calculateScoreStats(scores: number[]): { meanScore: number; standardDeviation: number; scoreDistribution: Record<string, number> } {
    const scoreDistribution: Record<string, number> = {};
    for (let i = 1; i <= 10; i++) {
      scoreDistribution[i.toString()] = 0;
    }

    scores.forEach((s) => {
      scoreDistribution[s.toString()] = (scoreDistribution[s.toString()] || 0) + 1;
    });

    let meanScore = 0;
    let standardDeviation = 0;

    if (scores.length > 0) {
      meanScore = parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      const variance = scores.reduce((a, b) => a + Math.pow(b - meanScore, 2), 0) / scores.length;
      standardDeviation = parseFloat(Math.sqrt(variance).toFixed(2));
    }

    return { meanScore, standardDeviation, scoreDistribution };
  }

  private async calculateAnimeStats(username: string): Promise<Prisma.InputJsonValue> {
    const entries = await this.prisma.client.aquilaAnimeUserList.findMany({
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

    const count = entries.length;
    const episodesWatched = entries.reduce((acc, curr) => acc + (curr.progress || 0), 0);

    // Calculate days watched
    const totalMinutes = entries.reduce((acc, curr) => {
      const duration = curr.anime?.duration || 24;
      return acc + (curr.progress || 0) * duration;
    }, 0);
    const daysWatched = parseFloat((totalMinutes / 1440).toFixed(1));

    // Calculate hours planned
    const plannedMinutes = entries
      .filter((e) => e.status === 'PLANNING')
      .reduce((acc, curr) => {
        const episodes = curr.anime?.episodes || 12;
        const duration = curr.anime?.duration || 24;
        return acc + episodes * duration;
      }, 0);
    const hoursPlanned = parseFloat((plannedMinutes / 60).toFixed(1));

    // Score stats
    const scores = entries
      .map((e) => e.score)
      .filter((s): s is number => s !== null && s > 0);
    const { meanScore, standardDeviation, scoreDistribution } = this.calculateScoreStats(scores);

    // Episode count distribution
    // Buckets: "1", "2-6", "7-16", "17-28", "29-55", "56-100", "101+", "Unknown"
    const episodeCountDistribution: Record<string, number> = {
      '1': 0,
      '2-6': 0,
      '7-16': 0,
      '17-28': 0,
      '29-55': 0,
      '56-100': 0,
      '101+': 0,
      Unknown: 0,
    };

    entries.forEach((e) => {
      const eps = e.anime?.episodes;
      if (eps === undefined || eps === null) {
        episodeCountDistribution['Unknown']++;
      } else if (eps === 1) {
        episodeCountDistribution['1']++;
      } else if (eps >= 2 && eps <= 6) {
        episodeCountDistribution['2-6']++;
      } else if (eps >= 7 && eps <= 16) {
        episodeCountDistribution['7-16']++;
      } else if (eps >= 17 && eps <= 28) {
        episodeCountDistribution['17-28']++;
      } else if (eps >= 29 && eps <= 55) {
        episodeCountDistribution['29-55']++;
      } else if (eps >= 56 && eps <= 100) {
        episodeCountDistribution['56-100']++;
      } else {
        episodeCountDistribution['101+']++;
      }
    });

    // Distributions
    const formatDistribution: Record<string, number> = {};
    const statusDistribution: Record<string, number> = {};
    const countryDistribution: Record<string, number> = {};

    entries.forEach((e) => {
      const format = e.anime?.format || 'UNKNOWN';
      formatDistribution[format] = (formatDistribution[format] || 0) + 1;

      const status = e.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;

      const country = e.anime?.countryOfOrigin || 'Unknown';
      countryDistribution[country] = (countryDistribution[country] || 0) + 1;
    });

    return {
      count,
      episodesWatched,
      daysWatched,
      hoursPlanned,
      meanScore,
      standardDeviation,
      scoreDistribution,
      episodeCountDistribution,
      formatDistribution,
      statusDistribution,
      countryDistribution,
    };
  }

  private async calculateMangaStats(username: string): Promise<Prisma.InputJsonValue> {
    const entries = await this.prisma.client.aquilaMangaUserList.findMany({
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

    const count = entries.length;
    const chaptersRead = entries.reduce((acc, curr) => acc + (curr.chapters || 0), 0);
    const volumesRead = entries.reduce((acc, curr) => acc + (curr.volumes || 0), 0);

    const chaptersPlanned = entries
      .filter((e) => e.status === 'PLANNING')
      .reduce((acc, curr) => acc + (curr.manga?.chapters || 0), 0);

    // Score stats
    const scores = entries
      .map((e) => e.score)
      .filter((s): s is number => s !== null && s > 0);
    const { meanScore, standardDeviation, scoreDistribution } = this.calculateScoreStats(scores);

    // Chapter count distribution
    // Buckets: "1-10", "11-50", "51-100", "101-200", "201+", "Unknown"
    const chapterCountDistribution: Record<string, number> = {
      '1-10': 0,
      '11-50': 0,
      '51-100': 0,
      '101-200': 0,
      '201+': 0,
      Unknown: 0,
    };

    entries.forEach((e) => {
      const chs = e.manga?.chapters;
      if (chs === undefined || chs === null) {
        chapterCountDistribution['Unknown']++;
      } else if (chs >= 1 && chs <= 10) {
        chapterCountDistribution['1-10']++;
      } else if (chs >= 11 && chs <= 50) {
        chapterCountDistribution['11-50']++;
      } else if (chs >= 51 && chs <= 100) {
        chapterCountDistribution['51-100']++;
      } else if (chs >= 101 && chs <= 200) {
        chapterCountDistribution['101-200']++;
      } else {
        chapterCountDistribution['201+']++;
      }
    });

    // Distributions
    const formatDistribution: Record<string, number> = {};
    const statusDistribution: Record<string, number> = {};
    const countryDistribution: Record<string, number> = {};

    entries.forEach((e) => {
      const format = e.manga?.format || 'UNKNOWN';
      formatDistribution[format] = (formatDistribution[format] || 0) + 1;

      const status = e.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;

      const country = e.manga?.countryOfOrigin || 'Unknown';
      countryDistribution[country] = (countryDistribution[country] || 0) + 1;
    });

    return {
      count,
      chaptersRead,
      volumesRead,
      chaptersPlanned,
      meanScore,
      standardDeviation,
      scoreDistribution,
      chapterCountDistribution,
      formatDistribution,
      statusDistribution,
      countryDistribution,
    };
  }

  private async calculateTvStats(username: string): Promise<Prisma.InputJsonValue> {
    const entries = await this.prisma.client.aquilaTvUserList.findMany({
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
          select: {
            id: true,
          },
        },
      },
    });

    const count = entries.length;
    const episodesWatched = entries.reduce((acc, curr) => acc + (curr.watchedEpisodes?.length || 0), 0);

    const totalMinutes = entries.reduce((acc, curr) => {
      const runtime = curr.tv?.averageRuntime || 45;
      return acc + (curr.watchedEpisodes?.length || 0) * runtime;
    }, 0);
    const hoursWatched = parseFloat((totalMinutes / 60).toFixed(1));

    // Score stats
    const scores = entries
      .map((e) => e.score)
      .filter((s): s is number => s !== null && s > 0);
    const { meanScore, standardDeviation, scoreDistribution } = this.calculateScoreStats(scores);

    // Distributions
    const statusDistribution: Record<string, number> = {};
    const countryDistribution: Record<string, number> = {};

    entries.forEach((e) => {
      const status = e.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;

      const country = e.tv?.originalCountry || 'Unknown';
      countryDistribution[country] = (countryDistribution[country] || 0) + 1;
    });

    return {
      count,
      episodesWatched,
      hoursWatched,
      meanScore,
      standardDeviation,
      scoreDistribution,
      statusDistribution,
      countryDistribution,
    };
  }

  private async calculateMovieStats(username: string): Promise<Prisma.InputJsonValue> {
    const entries = await this.prisma.client.aquilaMovieUserList.findMany({
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

    const count = entries.length;
    const completedMinutes = entries
      .filter((e) => e.status === 'COMPLETED')
      .reduce((acc, curr) => acc + (curr.movie?.runtime || 100), 0);
    const hoursWatched = parseFloat((completedMinutes / 60).toFixed(1));

    const plannedMinutes = entries
      .filter((e) => e.status === 'PLANNING')
      .reduce((acc, curr) => acc + (curr.movie?.runtime || 100), 0);
    const hoursPlanned = parseFloat((plannedMinutes / 60).toFixed(1));

    // Score stats
    const scores = entries
      .map((e) => e.score)
      .filter((s): s is number => s !== null && s > 0);
    const { meanScore, standardDeviation, scoreDistribution } = this.calculateScoreStats(scores);

    // Distributions
    const statusDistribution: Record<string, number> = {};
    const countryDistribution: Record<string, number> = {};

    entries.forEach((e) => {
      const status = e.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;

      const country = e.movie?.originalCountry || 'Unknown';
      countryDistribution[country] = (countryDistribution[country] || 0) + 1;
    });

    return {
      count,
      hoursWatched,
      hoursPlanned,
      meanScore,
      standardDeviation,
      scoreDistribution,
      statusDistribution,
      countryDistribution,
    };
  }

  private async calculateGameStats(username: string): Promise<Prisma.InputJsonValue> {
    const entries = await this.prisma.client.aquilaGameUserList.findMany({
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

    const count = entries.length;
    const hoursPlayed = entries.reduce((acc, curr) => acc + (curr.progress || 0), 0);

    // Score stats
    const scores = entries
      .map((e) => e.score)
      .filter((s): s is number => s !== null && s > 0);
    const { meanScore, standardDeviation, scoreDistribution } = this.calculateScoreStats(scores);

    // Distributions
    const statusDistribution: Record<string, number> = {};
    const platformDistribution: Record<string, number> = {};
    const genreDistribution: Record<string, number> = {};

    entries.forEach((e) => {
      const status = e.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;

      const platforms = e.game?.platforms || [];
      platforms.forEach((p) => {
        platformDistribution[p] = (platformDistribution[p] || 0) + 1;
      });

      const genres = e.game?.genres || [];
      genres.forEach((g) => {
        genreDistribution[g] = (genreDistribution[g] || 0) + 1;
      });
    });

    return {
      count,
      hoursPlayed,
      meanScore,
      standardDeviation,
      scoreDistribution,
      statusDistribution,
      platformDistribution,
      genreDistribution,
    };
  }

  private async calculateBookStats(username: string): Promise<Prisma.InputJsonValue> {
    const entries = await this.prisma.client.aquilaBookUserList.findMany({
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

    const count = entries.length;
    const chaptersRead = entries.reduce((acc, curr) => acc + (curr.chapters || 0), 0);
    const volumesRead = entries.reduce((acc, curr) => acc + (curr.volumes || 0), 0);

    const pagesRead = entries
      .filter((e) => e.status === 'COMPLETED')
      .reduce((acc, curr) => acc + (curr.book?.pages || 0), 0);

    // Score stats
    const scores = entries
      .map((e) => e.score)
      .filter((s): s is number => s !== null && s > 0);
    const { meanScore, standardDeviation, scoreDistribution } = this.calculateScoreStats(scores);

    // Distributions
    const statusDistribution: Record<string, number> = {};

    entries.forEach((e) => {
      const status = e.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    return {
      count,
      chaptersRead,
      volumesRead,
      pagesRead,
      meanScore,
      standardDeviation,
      scoreDistribution,
      statusDistribution,
    };
  }
}
