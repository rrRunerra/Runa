import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';

interface MediaConfigEntry {
  model: string;
  listModel: string;
  favType: string;
  idField: string;
  extIdField: string;
}

const mediaConfig: Record<string, MediaConfigEntry> = {
  anime: {
    model: 'aquilaAnimeV2',
    listModel: 'aquilaAnimeUserListV2',
    favType: 'ANIME',
    idField: 'animeId',
    extIdField: 'anilistId',
  },
  manga: {
    model: 'aquilaMangaV2',
    listModel: 'aquilaMangaUserListV2',
    favType: 'MANGA',
    idField: 'mangaId',
    extIdField: 'anilistId',
  },
  movie: {
    model: 'aquilaMovieV2',
    listModel: 'aquilaMovieUserListV2',
    favType: 'MOVIE',
    idField: 'movieId',
    extIdField: 'tvDBId',
  },
  tv: {
    model: 'aquilaTvV2',
    listModel: 'aquilaTvUserListV2',
    favType: 'TV',
    idField: 'tvId',
    extIdField: 'tvDBId',
  },
  game: {
    model: 'aquilaGameV2',
    listModel: 'aquilaGameUserListV2',
    favType: 'GAME',
    idField: 'gameId',
    extIdField: 'rawgId',
  },
  book: {
    model: 'aquilaBookV2',
    listModel: 'aquilaBookUserListV2',
    favType: 'BOOK',
    idField: 'bookId',
    extIdField: 'googleBookId',
  },
};

@Injectable()
export class MediaStatsService {
  private readonly logger = new Logger(MediaStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Recalculates all stats for a specific media from scratch by querying list and favorite entries.
   * Useful for initialization, fallbacks, or fixing drifted data.
   */
  async recalculateStatsFull(mediaType: string, id: number | string): Promise<void> {
    const type = mediaType.toLowerCase();
    const config = mediaConfig[type];
    if (!config) {
      this.logger.warn(`Unsupported media type: ${mediaType}`);
      return;
    }

    try {
      const mediaId = Number(id);
      if (isNaN(mediaId)) return;

      const media = await this.prisma.client[config.model].findUnique({
        where: { id: mediaId },
      });
      if (!media) return;

      // 1. Fetch user list entries for this media
      const entries = await this.prisma.client[config.listModel].findMany({
        where: { [config.idField]: mediaId },
      });

      const popularity = entries.length;

      // 2. Fetch favorites count
      let favoritesCount = 0;
      const extId = media[config.extIdField];
      if (extId !== undefined && extId !== null) {
        favoritesCount = await this.prisma.client.favorite.count({
          where: {
            type: config.favType as any,
            mediaId: String(extId),
          },
        });
      }

      // 3. Compute score stats and distributions
      let totalScoreSum = 0;
      let scoredCount = 0;
      const statusDist: Record<string, number> = {};
      const scoreDist: Record<string, number> = {};

      for (const entry of entries) {
        if (entry.status) {
          const statusStr = String(entry.status);
          statusDist[statusStr] = (statusDist[statusStr] || 0) + 1;
        }
        if (entry.score && entry.score > 0) {
          const scoreStr = String(entry.score);
          scoreDist[scoreStr] = (scoreDist[scoreStr] || 0) + 1;
          totalScoreSum += entry.score;
          scoredCount += 1;
        }
      }

      const avgScore = scoredCount > 0 ? parseFloat((totalScoreSum / scoredCount).toFixed(2)) : 0;

      const updatedMedia = await this.prisma.client[config.model].update({
        where: { id: mediaId },
        data: {
          popularity,
          favorites: favoritesCount,
          averageScore: avgScore,
          statusDistribution: statusDist,
          scoreDistribution: scoreDist,
          totalScoreSum,
          scoredCount,
        },
      });

      await this.updateCache(type, media, updatedMedia);
      this.logger.log(`Fully recalculated stats for ${type} id ${id}`);
    } catch (error) {
      this.logger.error(`Failed to full recalculate stats for ${type} id ${id}`, error);
    }
  }

  /**
   * Performs an incremental/delta-based update of media stats based on a mutated list entry.
   * Completely avoids querying all list entries for the media.
   */
  async updateStatsIncremental(
    mediaType: string,
    id: number | string,
    oldEntry?: any,
    newEntry?: any,
  ): Promise<void> {
    const type = mediaType.toLowerCase();
    const config = mediaConfig[type];
    if (!config) return;

    try {
      const mediaId = Number(id);
      if (isNaN(mediaId)) return;

      const media = await this.prisma.client[config.model].findUnique({
        where: { id: mediaId },
      });
      if (!media) return;

      let popularity = media.popularity ?? 0;
      let totalScoreSum = media.totalScoreSum ?? 0;
      let scoredCount = media.scoredCount ?? 0;

      let statusDist: Record<string, number> = {};
      if (media.statusDistribution && typeof media.statusDistribution === 'object') {
        statusDist = { ...(media.statusDistribution as Record<string, number>) };
      }

      let scoreDist: Record<string, number> = {};
      if (media.scoreDistribution && typeof media.scoreDistribution === 'object') {
        scoreDist = { ...(media.scoreDistribution as Record<string, number>) };
      }

      // Process deletion of old stats values
      if (oldEntry) {
        popularity = Math.max(0, popularity - 1);
        if (oldEntry.status) {
          const oldStatusStr = String(oldEntry.status);
          statusDist[oldStatusStr] = Math.max(0, (statusDist[oldStatusStr] || 0) - 1);
        }
        if (oldEntry.score && oldEntry.score > 0) {
          const oldScoreStr = String(oldEntry.score);
          scoreDist[oldScoreStr] = Math.max(0, (scoreDist[oldScoreStr] || 0) - 1);
          totalScoreSum = Math.max(0, totalScoreSum - oldEntry.score);
          scoredCount = Math.max(0, scoredCount - 1);
        }
      }

      // Process addition of new stats values
      if (newEntry) {
        popularity += 1;
        if (newEntry.status) {
          const newStatusStr = String(newEntry.status);
          statusDist[newStatusStr] = (statusDist[newStatusStr] || 0) + 1;
        }
        if (newEntry.score && newEntry.score > 0) {
          const newScoreStr = String(newEntry.score);
          scoreDist[newScoreStr] = (scoreDist[newScoreStr] || 0) + 1;
          totalScoreSum += newEntry.score;
          scoredCount += 1;
        }
      }

      const avgScore = scoredCount > 0 ? parseFloat((totalScoreSum / scoredCount).toFixed(2)) : 0;

      const updatedMedia = await this.prisma.client[config.model].update({
        where: { id: mediaId },
        data: {
          popularity,
          averageScore: avgScore,
          statusDistribution: statusDist,
          scoreDistribution: scoreDist,
          totalScoreSum,
          scoredCount,
        },
      });

      await this.updateCache(type, media, updatedMedia);
      this.logger.log(`Incrementally updated stats for ${type} id ${id}`);
    } catch (error) {
      this.logger.error(`Failed to incrementally update stats for ${type} id ${id}`, error);
      // Fallback to full recalculation on failure
      await this.recalculateStatsFull(mediaType, id);
    }
  }

  /**
   * Recalculates and updates the local favorites count for a media item.
   */
  async recalculateFavorites(mediaType: string, mediaIdStr: string): Promise<void> {
    const type = mediaType.toLowerCase();
    const config = mediaConfig[type];
    if (!config) return;

    try {
      const mediaId = Number(mediaIdStr);
      if (isNaN(mediaId)) return;

      const favoritesCount = await this.prisma.client.favorite.count({
        where: {
          type: config.favType as any,
          mediaId: mediaIdStr,
        },
      });

      const media = await this.prisma.client[config.model].findUnique({
        where: { id: mediaId },
      });
      if (!media) return;

      const updatedMedia = await this.prisma.client[config.model].update({
        where: { id: mediaId },
        data: {
          favorites: favoritesCount,
        },
      });

      await this.updateCache(type, media, updatedMedia);
      this.logger.log(`Updated favorites count to ${favoritesCount} for ${type} id ${mediaId}`);
    } catch (error) {
      this.logger.error(`Failed to update favorites count for ${type} id ${mediaIdStr}`, error);
    }
  }

  /**
   * Modifies the cached details object in Redis in-place so cache hits stay accurate
   * without needing to flush.
   */
  private async updateCache(mediaType: string, oldMedia: any, newMedia: any): Promise<void> {
    const cacheKey = `${mediaType}:${newMedia.id}`;
    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        const updated = {
          ...cached,
          popularity: newMedia.popularity,
          favorites: newMedia.favorites,
          averageScore: newMedia.averageScore,
          statusDistribution: newMedia.statusDistribution,
          scoreDistribution: newMedia.scoreDistribution,
          totalScoreSum: newMedia.totalScoreSum,
          scoredCount: newMedia.scoredCount,
        };
        await this.cacheService.set(cacheKey, updated, 60 * 60);
        this.logger.debug(`Cache hot-updated for key: ${cacheKey}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to update hot cache for key: ${cacheKey}`, error);
    }
  }
}
