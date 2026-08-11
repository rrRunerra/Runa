import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MediaType } from '@runa/database';
import { AquilaBitField } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';
import { RecommendationsRepository } from './recommendations.repository';
import {
  GetRecommendationsDto,
  CreateRecommendationDto,
  UpdateRecommendationDto,
  VoteRecommendationDto,
} from './recommendations.dto';
import {
  PaginatedRecommendationsEntity,
  RecommendationEntity,
  RecommendationVoteResultEntity,
} from './recommendations.entities';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly recommendationsRepository: RecommendationsRepository,
    private readonly cacheService: CacheService,
  ) {}

  public async getRecommendations(
    dto: GetRecommendationsDto,
    userId?: string,
  ): Promise<PaginatedRecommendationsEntity> {
    const cacheKey = CacheService.keys.recommendations(
      dto.mediaType,
      dto.mediaId,
      dto.cursor,
      dto.take,
      dto.sort,
    );

    // If unauthenticated, try to serve directly from cache
    if (!userId) {
      const cached = await this.cacheService.get<PaginatedRecommendationsEntity>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await this.recommendationsRepository.paginateRecommendations(
      dto.mediaType,
      dto.mediaId,
      {
        cursor: dto.cursor,
        take: dto.take ?? 10,
        sort: dto.sort ?? 'score',
        currentUserId: userId,
      },
    );

    // Cache unauthenticated / public page result for 5 minutes (300s)
    if (!userId) {
      await this.cacheService.set(cacheKey, result, 300);
    }

    return result;
  }

  public async createRecommendation(
    userId: string,
    dto: CreateRecommendationDto,
  ): Promise<RecommendationEntity> {
    if (dto.sourceType === dto.targetType && dto.sourceId === dto.targetId) {
      throw new BadRequestException('Cannot recommend a media to itself');
    }

    const [sourceExists, targetExists] = await Promise.all([
      this.recommendationsRepository.mediaExists(dto.sourceType, dto.sourceId),
      this.recommendationsRepository.mediaExists(dto.targetType, dto.targetId),
    ]);

    if (!sourceExists) {
      throw new NotFoundException(`Source media (${dto.sourceType} #${dto.sourceId}) not found`);
    }
    if (!targetExists) {
      throw new NotFoundException(`Target media (${dto.targetType} #${dto.targetId}) not found`);
    }

    const existing = await this.recommendationsRepository.findUserRecommendation(
      userId,
      dto.sourceType,
      dto.sourceId,
      dto.targetType,
      dto.targetId,
    );

    if (existing) {
      throw new ConflictException('You have already recommended this media pair');
    }

    const created = await this.recommendationsRepository.createRecommendation(userId, dto);

    // Invalidate caches
    await this.invalidateMediaCache(dto.sourceType, dto.sourceId);
    await this.invalidateMediaCache(dto.targetType, dto.targetId);

    // Hydrate recommended media
    const hydratedMap = await this.recommendationsRepository.hydrateMediaList([
      { type: dto.targetType, id: dto.targetId },
    ]);

    const recommendedMedia = hydratedMap.get(`${dto.targetType}:${dto.targetId}`) || {
      id: dto.targetId,
      type: dto.targetType,
      titlePrimary: 'Unknown Media',
      titleSecondary: null,
      coverImage: null,
    };

    return {
      id: created.id,
      userId: created.userId,
      user: created.user,
      sourceType: created.sourceType,
      sourceId: created.sourceId,
      targetType: created.targetType,
      targetId: created.targetId,
      recommendedMedia,
      body: created.body,
      upvotes: created.upvotes,
      downvotes: created.downvotes,
      score: created.score,
      userVote: null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  public async updateRecommendation(
    id: number,
    userId: string,
    dto: UpdateRecommendationDto,
    userPermissions: number[] = [],
  ): Promise<RecommendationEntity> {
    const recommendation = await this.recommendationsRepository.findRecommendationById(id);
    if (!recommendation) {
      throw new NotFoundException(`Recommendation #${id} not found`);
    }

    const bitfield = AquilaBitField.fromRaw(userPermissions);
    const isOwner = recommendation.userId === userId;
    const canManage =
      bitfield.has('MANAGE_RECOMMENDATIONS') ||
      bitfield.has('MANAGE');

    if (!isOwner && !canManage) {
      throw new ForbiddenException('You do not have permission to edit this recommendation');
    }

    const updated = await this.recommendationsRepository.updateRecommendation(id, dto);

    // Invalidate caches
    await this.invalidateMediaCache(recommendation.sourceType, recommendation.sourceId);
    await this.invalidateMediaCache(recommendation.targetType, recommendation.targetId);

    const hydratedMap = await this.recommendationsRepository.hydrateMediaList([
      { type: updated.targetType, id: updated.targetId },
    ]);

    const recommendedMedia = hydratedMap.get(`${updated.targetType}:${updated.targetId}`) || {
      id: updated.targetId,
      type: updated.targetType,
      titlePrimary: 'Unknown Media',
      titleSecondary: null,
      coverImage: null,
    };

    return {
      id: updated.id,
      userId: updated.userId,
      user: updated.user,
      sourceType: updated.sourceType,
      sourceId: updated.sourceId,
      targetType: updated.targetType,
      targetId: updated.targetId,
      recommendedMedia,
      body: updated.body,
      upvotes: updated.upvotes,
      downvotes: updated.downvotes,
      score: updated.score,
      userVote: null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  public async deleteRecommendation(
    id: number,
    userId: string,
    userPermissions: number[] = [],
  ): Promise<{ success: boolean }> {
    const recommendation = await this.recommendationsRepository.findRecommendationById(id);
    if (!recommendation) {
      throw new NotFoundException(`Recommendation #${id} not found`);
    }

    const bitfield = AquilaBitField.fromRaw(userPermissions);
    const isOwner = recommendation.userId === userId;
    const canManage =
      bitfield.has('MANAGE_RECOMMENDATIONS') ||
      bitfield.has('MANAGE');

    if (!isOwner && !canManage) {
      throw new ForbiddenException('You do not have permission to delete this recommendation');
    }

    await this.recommendationsRepository.deleteRecommendation(id);

    // Invalidate caches
    await this.invalidateMediaCache(recommendation.sourceType, recommendation.sourceId);
    await this.invalidateMediaCache(recommendation.targetType, recommendation.targetId);

    return { success: true };
  }

  public async voteRecommendation(
    id: number,
    userId: string,
    dto: VoteRecommendationDto,
  ): Promise<RecommendationVoteResultEntity> {
    const recommendation = await this.recommendationsRepository.findRecommendationById(id);
    if (!recommendation) {
      throw new NotFoundException(`Recommendation #${id} not found`);
    }

    const result = await this.recommendationsRepository.voteRecommendation(
      id,
      userId,
      dto.voteType,
    );

    // Invalidate caches
    await this.invalidateMediaCache(recommendation.sourceType, recommendation.sourceId);
    await this.invalidateMediaCache(recommendation.targetType, recommendation.targetId);

    return result;
  }

  private async invalidateMediaCache(mediaType: MediaType, mediaId: number): Promise<void> {
    try {
      const defaultKeyScore = CacheService.keys.recommendations(mediaType, mediaId, undefined, 10, 'score');
      const defaultKeyNewest = CacheService.keys.recommendations(mediaType, mediaId, undefined, 10, 'newest');
      await Promise.all([
        this.cacheService.del(defaultKeyScore),
        this.cacheService.del(defaultKeyNewest),
      ]);
    } catch (e) {
      this.logger.warn(`Failed to invalidate recommendation cache: ${e}`);
    }
  }
}
