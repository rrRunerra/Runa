import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@runa/database';
import { CacheService } from '../../providers/cache/cache.service';
import { parsePrivacy } from '../user/user.service';
import { StatsRepository } from './stats.repository';
import type {
  AnimeListEntry,
  MangaListEntry,
  TvListEntry,
  MovieListEntry,
  GameListEntry,
  BookListEntry,
} from './stats.repository';
import type {
  AnimeStatsEntity,
  MangaStatsEntity,
  TvStatsEntity,
  MovieStatsEntity,
  GameStatsEntity,
  BookStatsEntity,
  ScoreStatsEntity,
  StatsEntity,
} from './stats.entities';
import {
  DEFAULT_ANIME_STATS,
  DEFAULT_MANGA_STATS,
  DEFAULT_TV_STATS,
  DEFAULT_MOVIE_STATS,
  DEFAULT_GAME_STATS,
  DEFAULT_BOOK_STATS,
} from './stats.entities';
import type { ExtendedRequest } from 'src/common/guards/auth/auth.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 300; // 5 minutes
const VALID_MEDIA_TYPES = [
  'anime',
  'manga',
  'tv',
  'movie',
  'game',
  'book',
] as const;
type MediaType = (typeof VALID_MEDIA_TYPES)[number];

// ---------------------------------------------------------------------------
// type -> default entity map
// ---------------------------------------------------------------------------

const DEFAULT_STATS: Record<MediaType, StatsEntity> = {
  anime: DEFAULT_ANIME_STATS,
  manga: DEFAULT_MANGA_STATS,
  tv: DEFAULT_TV_STATS,
  movie: DEFAULT_MOVIE_STATS,
  game: DEFAULT_GAME_STATS,
  book: DEFAULT_BOOK_STATS,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a cache key for stats lookup.
 */
function statsCacheKey(username: string, mediaType: string): string {
  return `stats:${username.toLowerCase()}:${mediaType.toLowerCase()}`;
}

/**
 * Compute score statistics from an array of scores (1-10 scale).
 */
function computeScoreStats(scores: number[]): ScoreStatsEntity {
  const scoreDistribution: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) {
    scoreDistribution[i.toString()] = 0;
  }

  scores.forEach((s) => {
    const normalized = s > 10 ? s / 10 : s;
    const rounded = Math.min(10, Math.max(1, Math.round(normalized)));
    const key = rounded.toString();
    if (key in scoreDistribution) {
      scoreDistribution[key] = (scoreDistribution[key] || 0) + 1;
    }
  });

  let meanScore = 0;
  let standardDeviation = 0;

  if (scores.length > 0) {
    const normalizedScores = scores.map((s) => (s > 10 ? s / 10 : s));
    meanScore = parseFloat(
      (normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length).toFixed(2),
    );
    const variance =
      normalizedScores.reduce((a, b) => a + Math.pow(b - meanScore, 2), 0) /
      normalizedScores.length;
    standardDeviation = parseFloat(Math.sqrt(variance).toFixed(2));
  }

  return { meanScore, standardDeviation, scoreDistribution };
}

/**
 * Extract non-null, positive scores from entries, returning both the filtered
 * scores array and the computed score stats.
 */
function extractScoreStats<T extends { score: number | null }>(
  entries: T[],
): { scores: number[]; stats: ScoreStatsEntity } {
  const scores = entries
    .map((e) => {
      if (e.score === null || e.score === undefined || e.score <= 0) return null;
      return e.score > 10 ? parseFloat((e.score / 10).toFixed(2)) : e.score;
    })
    .filter((s): s is number => s !== null && s > 0);
  return { scores, stats: computeScoreStats(scores) };
}

/**
 * Build distribution records by iterating entries and extracting a key from each.
 */
function buildDistribution<T>(
  entries: T[],
  getKey: (entry: T) => string,
): Record<string, number> {
  const dist: Record<string, number> = {};
  entries.forEach((e) => {
    const key = getKey(e);
    dist[key] = (dist[key] || 0) + 1;
  });
  return dist;
}

/**
 * Check whether the requesting user is the profile owner.
 */
function isOwner(req: ExtendedRequest, ownerId: string): boolean {
  return req.user?.id === ownerId;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private readonly moduleCode = 'SsSve-';
  private readonly debounceTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly statsRepository: StatsRepository,
    private readonly cacheService: CacheService,
  ) {}

  // -------------------------------------------------------------------------
  // Public API — getStats
  // -------------------------------------------------------------------------

  public async getStats(
    username: string,
    mediaType: string,
    req: ExtendedRequest,
  ): Promise<StatsEntity> {
    if (!VALID_MEDIA_TYPES.includes(mediaType as MediaType)) {
      throw new BadRequestException(
        `Stats for type "${mediaType}" do not exist.`,
      );
    }

    // --- Lookup & privacy check ---
    const owner = await this.statsRepository.findUserByUsername(username);

    if (!owner) {
      throw new NotFoundException(`User "${username}" not found`);
    }

    const privacy = parsePrivacy(owner.privacy);

    // If the profile itself is private and viewer is not the owner, hide everything
    if (privacy.profile && !isOwner(req, owner.id)) {
      throw new NotFoundException(`User "${username}" not found`);
    }

    // Check the specific media type's privacy
    const mediaPrivacyKey = `${mediaType}List` as keyof typeof privacy;
    const isMediaPrivate = privacy[mediaPrivacyKey] === true;

    if (isMediaPrivate && !isOwner(req, owner.id)) {
      throw new NotFoundException(`User "${username}" not found`);
    }

    // --- Check cache ---
    const cacheKey = statsCacheKey(username, mediaType);
    const cached = await this.cacheService.get<StatsEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`Stats cache hit for ${cacheKey}`);
      return cached;
    }

    // --- Fetch from DB or return defaults ---
    const record = await this.statsRepository.findUserStats(
      owner.id,
      mediaType,
    );

    if (!record) {
      return DEFAULT_STATS[mediaType as MediaType] ?? DEFAULT_ANIME_STATS;
    }

    const data = record.statsData as unknown as StatsEntity;

    // Cache the result
    await this.cacheService.set(cacheKey, data, CACHE_TTL_SECONDS);

    return data;
  }

  // -------------------------------------------------------------------------
  // Recalculation (debounced)
  // -------------------------------------------------------------------------

  public recalculate(userId: string, mediaType: string): void {
    const key = `${userId}-${mediaType}`;

    if (this.debounceTimeouts.has(key)) {
      clearTimeout(this.debounceTimeouts.get(key));
    }

    const timeout = setTimeout(
      (uid: string, type: string, k: string) => {
        this.debounceTimeouts.delete(k);
        this.doRecalculate(uid, type).catch((err: Error) => {
          this.logger.error(
            `Error recalculating stats for ${k}: ${err.message}`,
            err.stack,
          );
        });
      },
      5000,
      userId,
      mediaType,
      key,
    );

    this.debounceTimeouts.set(key, timeout);
  }

  public async doRecalculate(userId: string, mediaType: string): Promise<void> {
    const user = await this.statsRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const username = user.username.toLowerCase();

    switch (mediaType.toLowerCase()) {
      case 'anime':
        await this.statsRepository.upsertUserStats(
          userId,
          mediaType,
          (await this.calculateAnimeStats(
            username,
          )) as unknown as Prisma.InputJsonValue,
        );
        break;
      case 'manga':
        await this.statsRepository.upsertUserStats(
          userId,
          mediaType,
          (await this.calculateMangaStats(
            username,
          )) as unknown as Prisma.InputJsonValue,
        );
        break;
      case 'tv':
        await this.statsRepository.upsertUserStats(
          userId,
          mediaType,
          (await this.calculateTvStats(
            username,
          )) as unknown as Prisma.InputJsonValue,
        );
        break;
      case 'movie':
        await this.statsRepository.upsertUserStats(
          userId,
          mediaType,
          (await this.calculateMovieStats(
            username,
          )) as unknown as Prisma.InputJsonValue,
        );
        break;
      case 'game':
        await this.statsRepository.upsertUserStats(
          userId,
          mediaType,
          (await this.calculateGameStats(
            username,
          )) as unknown as Prisma.InputJsonValue,
        );
        break;
      case 'book':
        await this.statsRepository.upsertUserStats(
          userId,
          mediaType,
          (await this.calculateBookStats(
            username,
          )) as unknown as Prisma.InputJsonValue,
        );
        break;
      default:
        throw new InternalServerErrorException(
          `Unsupported media type: ${mediaType}`,
        );
    }

    // Bust the cache so next getStats fetches fresh data
    await this.cacheService.del(statsCacheKey(username, mediaType));

    this.logger.log(
      `Successfully updated ${mediaType} stats for user ${user.username}`,
    );
  }

  // -------------------------------------------------------------------------
  // Calculation helpers — Anime
  // -------------------------------------------------------------------------

  private async calculateAnimeStats(
    username: string,
  ): Promise<AnimeStatsEntity> {
    const entries = await this.statsRepository.findAnimeList(username);
    const count = entries.length;

    const episodesWatched = entries.reduce(
      (acc, e) => acc + (e.progress || 0),
      0,
    );

    const totalMinutes = entries.reduce((acc, e) => {
      const duration = e.anime?.duration || 24;
      return acc + (e.progress || 0) * duration;
    }, 0);
    const daysWatched = parseFloat((totalMinutes / 1440).toFixed(1));

    const plannedMinutes = entries
      .filter((e) => e.status === 'PLANNING')
      .reduce((acc, e) => {
        const episodes = e.anime?.episodes || 12;
        const duration = e.anime?.duration || 24;
        return acc + episodes * duration;
      }, 0);
    const hoursPlanned = parseFloat((plannedMinutes / 60).toFixed(1));

    const { stats: scoreStats } = extractScoreStats(entries);

    // Episode count distribution
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
      if (eps === null || eps === undefined) {
        episodeCountDistribution['Unknown']++;
      } else if (eps === 1) {
        episodeCountDistribution['1']++;
      } else if (eps <= 6) {
        episodeCountDistribution['2-6']++;
      } else if (eps <= 16) {
        episodeCountDistribution['7-16']++;
      } else if (eps <= 28) {
        episodeCountDistribution['17-28']++;
      } else if (eps <= 55) {
        episodeCountDistribution['29-55']++;
      } else if (eps <= 100) {
        episodeCountDistribution['56-100']++;
      } else {
        episodeCountDistribution['101+']++;
      }
    });

    const formatDistribution = buildDistribution(
      entries,
      (e) => e.anime?.format || 'UNKNOWN',
    );
    const statusDistribution = buildDistribution(entries, (e) => e.status);
    const countryDistribution = buildDistribution(
      entries,
      (e) => e.anime?.countryOfOrigin || 'Unknown',
    );

    return {
      count,
      episodesWatched,
      daysWatched,
      hoursPlanned,
      ...scoreStats,
      episodeCountDistribution,
      formatDistribution,
      statusDistribution,
      countryDistribution,
    };
  }

  // -------------------------------------------------------------------------
  // Calculation helpers — Manga
  // -------------------------------------------------------------------------

  private async calculateMangaStats(
    username: string,
  ): Promise<MangaStatsEntity> {
    const entries = await this.statsRepository.findMangaList(username);
    const count = entries.length;

    const chaptersRead = entries.reduce((acc, e) => acc + (e.chapters || 0), 0);
    const volumesRead = entries.reduce((acc, e) => acc + (e.volumes || 0), 0);

    const chaptersPlanned = entries
      .filter((e) => e.status === 'PLANNING')
      .reduce((acc, e) => acc + (e.manga?.chapters || 0), 0);

    const { stats: scoreStats } = extractScoreStats(entries);

    // Chapter count distribution
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
      if (chs === null || chs === undefined) {
        chapterCountDistribution['Unknown']++;
      } else if (chs <= 10) {
        chapterCountDistribution['1-10']++;
      } else if (chs <= 50) {
        chapterCountDistribution['11-50']++;
      } else if (chs <= 100) {
        chapterCountDistribution['51-100']++;
      } else if (chs <= 200) {
        chapterCountDistribution['101-200']++;
      } else {
        chapterCountDistribution['201+']++;
      }
    });

    const formatDistribution = buildDistribution(
      entries,
      (e) => e.manga?.format || 'UNKNOWN',
    );
    const statusDistribution = buildDistribution(entries, (e) => e.status);
    const countryDistribution = buildDistribution(
      entries,
      (e) => e.manga?.countryOfOrigin || 'Unknown',
    );

    return {
      count,
      chaptersRead,
      volumesRead,
      chaptersPlanned,
      ...scoreStats,
      chapterCountDistribution,
      formatDistribution,
      statusDistribution,
      countryDistribution,
    };
  }

  // -------------------------------------------------------------------------
  // Calculation helpers — TV
  // -------------------------------------------------------------------------

  private async calculateTvStats(username: string): Promise<TvStatsEntity> {
    const entries = await this.statsRepository.findTvList(username);
    const count = entries.length;

    const episodesWatched = entries.reduce(
      (acc, e) => acc + (e.watchedEpisodes?.length || 0),
      0,
    );

    const totalMinutes = entries.reduce((acc, e) => {
      const runtime = e.tv?.averageRuntime || 45;
      return acc + (e.watchedEpisodes?.length || 0) * runtime;
    }, 0);
    const hoursWatched = parseFloat((totalMinutes / 60).toFixed(1));

    const { stats: scoreStats } = extractScoreStats(entries);

    const statusDistribution = buildDistribution(entries, (e) => e.status);
    const countryDistribution = buildDistribution(
      entries,
      (e) => e.tv?.originalCountry || 'Unknown',
    );

    return {
      count,
      episodesWatched,
      hoursWatched,
      ...scoreStats,
      statusDistribution,
      countryDistribution,
    };
  }

  // -------------------------------------------------------------------------
  // Calculation helpers — Movie
  // -------------------------------------------------------------------------

  private async calculateMovieStats(
    username: string,
  ): Promise<MovieStatsEntity> {
    const entries = await this.statsRepository.findMovieList(username);
    const count = entries.length;

    const completedMinutes = entries
      .filter((e) => e.status === 'COMPLETED')
      .reduce((acc, e) => acc + (e.movie?.runtime || 100), 0);
    const hoursWatched = parseFloat((completedMinutes / 60).toFixed(1));

    const plannedMinutes = entries
      .filter((e) => e.status === 'PLANNING')
      .reduce((acc, e) => acc + (e.movie?.runtime || 100), 0);
    const hoursPlanned = parseFloat((plannedMinutes / 60).toFixed(1));

    const { stats: scoreStats } = extractScoreStats(entries);

    const statusDistribution = buildDistribution(entries, (e) => e.status);
    const countryDistribution = buildDistribution(
      entries,
      (e) => e.movie?.originalCountry || 'Unknown',
    );

    return {
      count,
      hoursWatched,
      hoursPlanned,
      ...scoreStats,
      statusDistribution,
      countryDistribution,
    };
  }

  // -------------------------------------------------------------------------
  // Calculation helpers — Game
  // -------------------------------------------------------------------------

  private async calculateGameStats(username: string): Promise<GameStatsEntity> {
    const entries = await this.statsRepository.findGameList(username);
    const count = entries.length;

    const hoursPlayed = entries.reduce((acc, e) => acc + (e.progress || 0), 0);

    const { stats: scoreStats } = extractScoreStats(entries);

    const statusDistribution = buildDistribution(entries, (e) => e.status);

    const platformDistribution: Record<string, number> = {};
    const genreDistribution: Record<string, number> = {};
    entries.forEach((e) => {
      (e.game?.platforms || []).forEach((p) => {
        platformDistribution[p] = (platformDistribution[p] || 0) + 1;
      });
      (e.game?.genres || []).forEach((g) => {
        genreDistribution[g] = (genreDistribution[g] || 0) + 1;
      });
    });

    return {
      count,
      hoursPlayed,
      ...scoreStats,
      statusDistribution,
      platformDistribution,
      genreDistribution,
    };
  }

  // -------------------------------------------------------------------------
  // Calculation helpers — Book
  // -------------------------------------------------------------------------

  private async calculateBookStats(username: string): Promise<BookStatsEntity> {
    const entries = await this.statsRepository.findBookList(username);
    const count = entries.length;

    const chaptersRead = entries.reduce((acc, e) => acc + (e.chapters || 0), 0);
    const volumesRead = entries.reduce((acc, e) => acc + (e.volumes || 0), 0);

    const pagesRead = entries
      .filter((e) => e.status === 'COMPLETED')
      .reduce((acc, e) => acc + (e.book?.pages || 0), 0);

    const { stats: scoreStats } = extractScoreStats(entries);

    const statusDistribution = buildDistribution(entries, (e) => e.status);

    return {
      count,
      chaptersRead,
      volumesRead,
      pagesRead,
      ...scoreStats,
      statusDistribution,
    };
  }
}
