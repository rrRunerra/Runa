import { Injectable, Logger } from '@nestjs/common';

import { FavoriteType } from '@runa/database';

import { rrNotFoundException, rrConflictException } from 'src/providers/error';

import { FavoriteRepository } from './favorite.repository';
import { MediaStatsService } from '../list/media-stats.service';
import type { AddFavoriteDto } from './favorite.dto';
import type {
  FavoriteEntity,
  FavoriteStatusEntity,
  FavoriteSuccessEntity,
  ResolvedFavoriteEntity,
} from './favorite.entities';

@Injectable()
export class FavoriteService {
  private readonly logger = new Logger(FavoriteService.name);
  private readonly moduleCode = 'FeSve-';

  constructor(
    private readonly favoriteRepository: FavoriteRepository,
    private readonly mediaStatsService: MediaStatsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Add
  // ---------------------------------------------------------------------------

  async addFavorite(
    userId: string,
    dto: AddFavoriteDto,
  ): Promise<FavoriteEntity> {
    const existing = await this.favoriteRepository.findUnique(
      userId,
      dto.type,
      dto.targetId,
    );

    if (existing) {
      throw new rrConflictException(`${this.moduleCode}FAE001`, {
        message: 'Already in favorites',
      });
    }

    const record = await this.favoriteRepository.create(
      userId,
      dto.type,
      dto.targetId,
    );

    // Recalculate local favorites count
    void this.mediaStatsService.recalculateFavorites(dto.type.toLowerCase(), dto.targetId);

    return this.toEntity(record);
  }

  // ---------------------------------------------------------------------------
  // Remove
  // ---------------------------------------------------------------------------

  async removeFavorite(
    userId: string,
    type: FavoriteType,
    targetId: string,
  ): Promise<FavoriteSuccessEntity> {
    try {
      await this.favoriteRepository.delete(userId, type, targetId);
      // Recalculate local favorites count
      void this.mediaStatsService.recalculateFavorites(type.toLowerCase(), targetId);
      return { success: true };
    } catch {
      throw new rrNotFoundException(`${this.moduleCode}FNF001`, {
        message: 'Favorite not found',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // List (authenticated user's own favorites)
  // ---------------------------------------------------------------------------

  async getFavorites(
    userId: string,
    type?: FavoriteType,
  ): Promise<FavoriteEntity[]> {
    const records = await this.favoriteRepository.findManyByUserId(
      userId,
      type,
    );
    return records.map((r) => this.toEntity(r));
  }

  // ---------------------------------------------------------------------------
  // Status check
  // ---------------------------------------------------------------------------

  async getFavoriteStatus(
    userId: string,
    type: FavoriteType,
    targetId: string,
  ): Promise<FavoriteStatusEntity> {
    const record = await this.favoriteRepository.findUnique(
      userId,
      type,
      targetId,
    );
    return { favorited: !!record };
  }

  // ---------------------------------------------------------------------------
  // Public profile favorites (enriched)
  // ---------------------------------------------------------------------------

  async getFavoritesByUsername(
    username: string,
    type?: FavoriteType,
  ): Promise<ResolvedFavoriteEntity[]> {
    const user = await this.favoriteRepository.findUserByUsername(username);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF001`, {
        message: `User ${username} not found`,
      });
    }

    const records = await this.favoriteRepository.findManyByUserId(
      user.id,
      type,
    );

    const resolved: ResolvedFavoriteEntity[] = [];

    for (const fav of records) {
      let title = '';
      let image = '';

      try {
        const details = await this.favoriteRepository.resolveMedia(
          fav.type,
          fav.mediaId,
        );

        if (details) {
          ({ title, image } = this.extractTitleAndImage(fav.type, details));
        }
      } catch (err: unknown) {
        this.logger.warn(`Failed to resolve media for favorite ${fav.id}`, err);
      }

      resolved.push({
        id: fav.id,
        userId: fav.userId,
        type: fav.type,
        targetId: fav.mediaId,
        createdAt: fav.createdAt,
        title,
        image,
      });
    }

    return resolved;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toEntity(record: import('@runa/database').Favorite): FavoriteEntity {
    return {
      id: record.id,
      userId: record.userId,
      type: record.type,
      targetId: record.mediaId,
      createdAt: record.createdAt,
    };
  }

  private extractTitleAndImage(
    type: FavoriteType,
    details: Record<string, unknown>,
  ): { title: string; image: string } {
    switch (type) {
      case FavoriteType.ANIME:
      case FavoriteType.MANGA:
        return {
          title:
            (details.titlePrimary as string | null) ??
            (details.titleSecondary as string | null) ??
            (details.titleNative as string | null) ??
            (details.titleEnglish as string | null) ??
            (details.titleRomaji as string | null) ??
            '',
          image:
            (details.coverImage as string | null) ??
            (details.coverImageLarge as string | null) ??
            '',
        };
      case FavoriteType.TV:
      case FavoriteType.MOVIE:
      case FavoriteType.GAME:
      case FavoriteType.BOOK:
        return {
          title:
            (details.titlePrimary as string | null) ??
            (details.titleEnglish as string | null) ??
            (details.titleString as string | null) ??
            '',
          image: (details.coverImage as string | null) ?? '',
        };
      case FavoriteType.USER:
        return {
          title:
            (details.displayName as string | null) ??
            (details.username as string) ??
            '',
          image: (details.avatarUrl as string | null) ?? '',
        };
      case FavoriteType.CHARACTER:
      case FavoriteType.ACTOR:
      case FavoriteType.STAFF:
        return {
          title:
            (details.namePrimary as string | null) ??
            (details.nameNative as string | null) ??
            (details.name as string | null) ??
            '',
          image: (details.image as string | null) ?? '',
        };
      case FavoriteType.STUDIO:
        return {
          title: (details.name as string | null) ?? '',
          image: '',
        };
      case FavoriteType.MUSIC:
        return {
          title: (details.title as string | null) ?? '',
          image: '',
        };
      default:
        return { title: '', image: '' };
    }
  }
}
