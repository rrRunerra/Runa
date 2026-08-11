import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MediaType } from '@runa/database';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsRepository } from './recommendations.repository';
import { CacheService } from '../../providers/cache/cache.service';
import { VoteActionType } from './recommendations.dto';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let repository: jest.Mocked<RecommendationsRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockRepo = {
    findRecommendationById: jest.fn(),
    findUserRecommendation: jest.fn(),
    mediaExists: jest.fn(),
    hydrateMediaList: jest.fn(),
    paginateRecommendations: jest.fn(),
    createRecommendation: jest.fn(),
    updateRecommendation: jest.fn(),
    deleteRecommendation: jest.fn(),
    voteRecommendation: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: RecommendationsRepository,
          useValue: mockRepo,
        },
        {
          provide: CacheService,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    repository = module.get(RecommendationsRepository);
    cacheService = module.get(CacheService);
  });

  describe('getRecommendations', () => {
    it('should return cached data if available for unauthenticated request', async () => {
      const cachedData = {
        data: [],
        pageInfo: { count: 0, nextCursor: null, hasMore: false },
      };
      mockCache.get.mockResolvedValue(cachedData);

      const result = await service.getRecommendations({
        mediaType: MediaType.ANIME,
        mediaId: 1,
      });

      expect(result).toEqual(cachedData);
      expect(mockRepo.paginateRecommendations).not.toHaveBeenCalled();
    });

    it('should query repository and cache when not in cache for unauthenticated request', async () => {
      mockCache.get.mockResolvedValue(null);
      const repoResult = {
        data: [],
        pageInfo: { count: 0, nextCursor: null, hasMore: false },
      };
      mockRepo.paginateRecommendations.mockResolvedValue(repoResult);

      const result = await service.getRecommendations({
        mediaType: MediaType.ANIME,
        mediaId: 1,
      });

      expect(result).toEqual(repoResult);
      expect(mockRepo.paginateRecommendations).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should bypass cache read and not cache when userId is present', async () => {
      const repoResult = {
        data: [],
        pageInfo: { count: 0, nextCursor: null, hasMore: false },
        userRecommendation: null,
      };
      mockRepo.paginateRecommendations.mockResolvedValue(repoResult);

      const result = await service.getRecommendations(
        {
          mediaType: MediaType.ANIME,
          mediaId: 1,
        },
        'user-123',
      );

      expect(result).toEqual(repoResult);
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('createRecommendation', () => {
    it('should throw BadRequestException if recommending to self', async () => {
      await expect(
        service.createRecommendation('user-123', {
          sourceType: MediaType.ANIME,
          sourceId: 1,
          targetType: MediaType.ANIME,
          targetId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if source media does not exist', async () => {
      mockRepo.mediaExists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      await expect(
        service.createRecommendation('user-123', {
          sourceType: MediaType.ANIME,
          sourceId: 1,
          targetType: MediaType.GAME,
          targetId: 2,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate recommendation exists', async () => {
      mockRepo.mediaExists.mockResolvedValue(true);
      mockRepo.findUserRecommendation.mockResolvedValue({ id: 10 });

      await expect(
        service.createRecommendation('user-123', {
          sourceType: MediaType.ANIME,
          sourceId: 1,
          targetType: MediaType.GAME,
          targetId: 2,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create recommendation and invalidate cache', async () => {
      mockRepo.mediaExists.mockResolvedValue(true);
      mockRepo.findUserRecommendation.mockResolvedValue(null);
      mockRepo.createRecommendation.mockResolvedValue({
        id: 1,
        userId: 'user-123',
        sourceType: MediaType.ANIME,
        sourceId: 1,
        targetType: MediaType.GAME,
        targetId: 2,
        body: 'Great game for anime fans',
        upvotes: 0,
        downvotes: 0,
        score: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-123', username: 'tester', displayName: 'Tester', avatarUrl: null },
      });
      mockRepo.hydrateMediaList.mockResolvedValue(
        new Map([
          [
            `${MediaType.GAME}:2`,
            {
              id: 2,
              type: MediaType.GAME,
              titlePrimary: 'Game Title',
              titleSecondary: null,
              coverImage: 'http://img.png',
            },
          ],
        ]),
      );

      const result = await service.createRecommendation('user-123', {
        sourceType: MediaType.ANIME,
        sourceId: 1,
        targetType: MediaType.GAME,
        targetId: 2,
        body: 'Great game for anime fans',
      });

      expect(result.id).toBe(1);
      expect(result.recommendedMedia.titlePrimary).toBe('Game Title');
      expect(mockCache.del).toHaveBeenCalled();
    });
  });

  describe('updateRecommendation', () => {
    it('should throw NotFoundException if recommendation does not exist', async () => {
      mockRepo.findRecommendationById.mockResolvedValue(null);

      await expect(
        service.updateRecommendation(999, 'user-123', { body: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner and not moderator', async () => {
      mockRepo.findRecommendationById.mockResolvedValue({
        id: 1,
        userId: 'other-user',
        sourceType: MediaType.ANIME,
        sourceId: 1,
        targetType: MediaType.GAME,
        targetId: 2,
      });

      await expect(
        service.updateRecommendation(1, 'user-123', { body: 'Updated' }, []),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update recommendation if user is owner', async () => {
      mockRepo.findRecommendationById.mockResolvedValue({
        id: 1,
        userId: 'user-123',
        sourceType: MediaType.ANIME,
        sourceId: 1,
        targetType: MediaType.GAME,
        targetId: 2,
      });
      mockRepo.updateRecommendation.mockResolvedValue({
        id: 1,
        userId: 'user-123',
        sourceType: MediaType.ANIME,
        sourceId: 1,
        targetType: MediaType.GAME,
        targetId: 2,
        body: 'Updated body',
        upvotes: 2,
        downvotes: 0,
        score: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-123', username: 'tester', displayName: 'Tester', avatarUrl: null },
      });
      mockRepo.hydrateMediaList.mockResolvedValue(new Map());

      const result = await service.updateRecommendation(1, 'user-123', { body: 'Updated body' });
      expect(result.body).toBe('Updated body');
      expect(mockCache.del).toHaveBeenCalled();
    });
  });

  describe('deleteRecommendation', () => {
    it('should delete recommendation and invalidate cache', async () => {
      mockRepo.findRecommendationById.mockResolvedValue({
        id: 1,
        userId: 'user-123',
        sourceType: MediaType.ANIME,
        sourceId: 1,
        targetType: MediaType.GAME,
        targetId: 2,
      });

      const result = await service.deleteRecommendation(1, 'user-123');
      expect(result.success).toBe(true);
      expect(mockRepo.deleteRecommendation).toHaveBeenCalledWith(1);
      expect(mockCache.del).toHaveBeenCalled();
    });
  });

  describe('voteRecommendation', () => {
    it('should vote on recommendation and invalidate cache', async () => {
      mockRepo.findRecommendationById.mockResolvedValue({
        id: 1,
        sourceType: MediaType.ANIME,
        sourceId: 1,
        targetType: MediaType.GAME,
        targetId: 2,
      });
      mockRepo.voteRecommendation.mockResolvedValue({
        recommendationId: 1,
        upvotes: 1,
        downvotes: 0,
        score: 1,
        userVote: 'UPVOTE',
      });

      const result = await service.voteRecommendation(1, 'user-123', {
        voteType: VoteActionType.UPVOTE,
      });

      expect(result.score).toBe(1);
      expect(result.userVote).toBe('UPVOTE');
      expect(mockCache.del).toHaveBeenCalled();
    });
  });
});
