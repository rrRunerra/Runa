import { Injectable } from '@nestjs/common';
import { MediaType, RecommendationVoteType } from '@runa/database';
import { PrismaService } from '../../providers/database/prisma.service';
import { CreateRecommendationDto, UpdateRecommendationDto, VoteActionType } from './recommendations.dto';
import {
  HydratedMediaSummary,
  RecommendationItem,
  RecommendationUserSummary,
} from './recommendations.types';
import { PaginatedRecommendationsEntity, RecommendationVoteResultEntity } from './recommendations.entities';

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
};

@Injectable()
export class RecommendationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findRecommendationById(id: number): Promise<any | null> {
    return this.prisma.client.aquilaRecommendation.findUnique({
      where: { id },
      include: {
        user: { select: userSelect },
      },
    });
  }

  public async findUserRecommendation(
    userId: string,
    sourceType: MediaType,
    sourceId: number,
    targetType: MediaType,
    targetId: number,
  ): Promise<any | null> {
    return this.prisma.client.aquilaRecommendation.findFirst({
      where: {
        userId,
        OR: [
          {
            sourceType,
            sourceId,
            targetType,
            targetId,
          },
          {
            sourceType: targetType,
            sourceId: targetId,
            targetType: sourceType,
            targetId: sourceId,
          },
        ],
      },
      include: {
        user: { select: userSelect },
      },
    });
  }

  public async mediaExists(type: MediaType, id: number): Promise<boolean> {
    switch (type) {
      case MediaType.ANIME: {
        const count = await this.prisma.client.aquilaAnimeV2.count({ where: { id } });
        return count > 0;
      }
      case MediaType.MANGA: {
        const count = await this.prisma.client.aquilaMangaV2.count({ where: { id } });
        return count > 0;
      }
      case MediaType.TV: {
        const count = await this.prisma.client.aquilaTvV2.count({ where: { id } });
        return count > 0;
      }
      case MediaType.MOVIE: {
        const count = await this.prisma.client.aquilaMovieV2.count({ where: { id } });
        return count > 0;
      }
      case MediaType.GAME: {
        const count = await this.prisma.client.aquilaGameV2.count({ where: { id } });
        return count > 0;
      }
      case MediaType.BOOK: {
        const count = await this.prisma.client.aquilaBookV2.count({ where: { id } });
        return count > 0;
      }
      default:
        return false;
    }
  }

  public async hydrateMediaList(
    pairs: { type: MediaType; id: number }[],
  ): Promise<Map<string, HydratedMediaSummary>> {
    const map = new Map<string, HydratedMediaSummary>();
    if (pairs.length === 0) return map;

    const animeIds = new Set<number>();
    const mangaIds = new Set<number>();
    const tvIds = new Set<number>();
    const movieIds = new Set<number>();
    const gameIds = new Set<number>();
    const bookIds = new Set<number>();

    for (const p of pairs) {
      switch (p.type) {
        case MediaType.ANIME:
          animeIds.add(p.id);
          break;
        case MediaType.MANGA:
          mangaIds.add(p.id);
          break;
        case MediaType.TV:
          tvIds.add(p.id);
          break;
        case MediaType.MOVIE:
          movieIds.add(p.id);
          break;
        case MediaType.GAME:
          gameIds.add(p.id);
          break;
        case MediaType.BOOK:
          bookIds.add(p.id);
          break;
      }
    }

    const [animes, mangas, tvs, movies, games, books] = await Promise.all([
      animeIds.size > 0
        ? this.prisma.client.aquilaAnimeV2.findMany({
            where: { id: { in: Array.from(animeIds) } },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
          })
        : [],
      mangaIds.size > 0
        ? this.prisma.client.aquilaMangaV2.findMany({
            where: { id: { in: Array.from(mangaIds) } },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
          })
        : [],
      tvIds.size > 0
        ? this.prisma.client.aquilaTvV2.findMany({
            where: { id: { in: Array.from(tvIds) } },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
          })
        : [],
      movieIds.size > 0
        ? this.prisma.client.aquilaMovieV2.findMany({
            where: { id: { in: Array.from(movieIds) } },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
          })
        : [],
      gameIds.size > 0
        ? this.prisma.client.aquilaGameV2.findMany({
            where: { id: { in: Array.from(gameIds) } },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
          })
        : [],
      bookIds.size > 0
        ? this.prisma.client.aquilaBookV2.findMany({
            where: { id: { in: Array.from(bookIds) } },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
          })
        : [],
    ]);

    for (const item of animes) {
      map.set(`${MediaType.ANIME}:${item.id}`, {
        id: item.id,
        type: MediaType.ANIME,
        titlePrimary: item.titlePrimary,
        titleSecondary: item.titleSecondary,
        coverImage: item.coverImage,
      });
    }
    for (const item of mangas) {
      map.set(`${MediaType.MANGA}:${item.id}`, {
        id: item.id,
        type: MediaType.MANGA,
        titlePrimary: item.titlePrimary,
        titleSecondary: item.titleSecondary,
        coverImage: item.coverImage,
      });
    }
    for (const item of tvs) {
      map.set(`${MediaType.TV}:${item.id}`, {
        id: item.id,
        type: MediaType.TV,
        titlePrimary: item.titlePrimary,
        titleSecondary: item.titleSecondary,
        coverImage: item.coverImage,
      });
    }
    for (const item of movies) {
      map.set(`${MediaType.MOVIE}:${item.id}`, {
        id: item.id,
        type: MediaType.MOVIE,
        titlePrimary: item.titlePrimary,
        titleSecondary: item.titleSecondary,
        coverImage: item.coverImage,
      });
    }
    for (const item of games) {
      map.set(`${MediaType.GAME}:${item.id}`, {
        id: item.id,
        type: MediaType.GAME,
        titlePrimary: item.titlePrimary,
        titleSecondary: item.titleSecondary,
        coverImage: item.coverImage,
      });
    }
    for (const item of books) {
      map.set(`${MediaType.BOOK}:${item.id}`, {
        id: item.id,
        type: MediaType.BOOK,
        titlePrimary: item.titlePrimary,
        titleSecondary: item.titleSecondary,
        coverImage: item.coverImage,
      });
    }

    return map;
  }

  public async paginateRecommendations(
    mediaType: MediaType,
    mediaId: number,
    options: {
      cursor?: string;
      take?: number;
      sort?: 'score' | 'newest';
      currentUserId?: string;
    },
  ): Promise<PaginatedRecommendationsEntity> {
    const take = options.take || 10;
    const cursorValue = options.cursor ? Number(options.cursor) : undefined;
    const sort = options.sort || 'score';

    const where = {
      OR: [
        { sourceType: mediaType, sourceId: mediaId },
        { targetType: mediaType, targetId: mediaId },
      ],
    };

    const orderBy: any =
      sort === 'newest'
        ? [{ createdAt: 'desc' }, { id: 'desc' }]
        : [{ score: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];

    const [totalCount, rawItems] = await Promise.all([
      this.prisma.client.aquilaRecommendation.count({ where }),
      this.prisma.client.aquilaRecommendation.findMany({
        where,
        take: take + 1,
        ...(cursorValue
          ? {
              cursor: { id: cursorValue },
              skip: 1,
            }
          : {}),
        orderBy,
        include: {
          user: { select: userSelect },
          ...(options.currentUserId
            ? {
                votes: {
                  where: { userId: options.currentUserId },
                  select: { voteType: true },
                },
              }
            : {}),
        },
      }),
    ]);

    const hasMore = rawItems.length > take;
    const pageItems = hasMore ? rawItems.slice(0, take) : rawItems;
    const nextCursor =
      hasMore && pageItems.length > 0
        ? String(pageItems[pageItems.length - 1].id)
        : null;

    // Determine counterpart media to hydrate
    const mediaToHydrate = pageItems.map((r: any) => {
      const isSource = r.sourceType === mediaType && r.sourceId === mediaId;
      return {
        type: isSource ? r.targetType : r.sourceType,
        id: isSource ? r.targetId : r.sourceId,
      };
    });

    const hydratedMap = await this.hydrateMediaList(mediaToHydrate);

    const data: RecommendationItem[] = pageItems.map((r: any) => {
      const isSource = r.sourceType === mediaType && r.sourceId === mediaId;
      const counterpartType = isSource ? r.targetType : r.sourceType;
      const counterpartId = isSource ? r.targetId : r.sourceId;
      const recommendedMedia = hydratedMap.get(
        `${counterpartType}:${counterpartId}`,
      ) || {
        id: counterpartId,
        type: counterpartType,
        titlePrimary: 'Unknown Media',
        titleSecondary: null,
        coverImage: null,
      };

      const userVote = r.votes && r.votes.length > 0 ? (r.votes[0].voteType as RecommendationVoteType) : null;

      return {
        id: r.id,
        userId: r.userId,
        user: r.user as RecommendationUserSummary,
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        targetType: r.targetType,
        targetId: r.targetId,
        recommendedMedia,
        body: r.body,
        upvotes: r.upvotes,
        downvotes: r.downvotes,
        score: r.score,
        userVote,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    // Check user's own recommendation for this media if authenticated
    let userRecommendation: RecommendationItem | null = null;
    if (options.currentUserId) {
      const ownRecord = await this.prisma.client.aquilaRecommendation.findFirst({
        where: {
          userId: options.currentUserId,
          ...where,
        },
        include: {
          user: { select: userSelect },
          votes: {
            where: { userId: options.currentUserId },
            select: { voteType: true },
          },
        },
      });

      if (ownRecord) {
        const isSource = ownRecord.sourceType === mediaType && ownRecord.sourceId === mediaId;
        const counterpartType = isSource ? ownRecord.targetType : ownRecord.sourceType;
        const counterpartId = isSource ? ownRecord.targetId : ownRecord.sourceId;
        const ownHydrated = await this.hydrateMediaList([{ type: counterpartType, id: counterpartId }]);
        const recommendedMedia = ownHydrated.get(`${counterpartType}:${counterpartId}`) || {
          id: counterpartId,
          type: counterpartType,
          titlePrimary: 'Unknown Media',
          titleSecondary: null,
          coverImage: null,
        };

        const userVote = ownRecord.votes && ownRecord.votes.length > 0
          ? (ownRecord.votes[0].voteType as RecommendationVoteType)
          : null;

        userRecommendation = {
          id: ownRecord.id,
          userId: ownRecord.userId,
          user: ownRecord.user as RecommendationUserSummary,
          sourceType: ownRecord.sourceType,
          sourceId: ownRecord.sourceId,
          targetType: ownRecord.targetType,
          targetId: ownRecord.targetId,
          recommendedMedia,
          body: ownRecord.body,
          upvotes: ownRecord.upvotes,
          downvotes: ownRecord.downvotes,
          score: ownRecord.score,
          userVote,
          createdAt: ownRecord.createdAt,
          updatedAt: ownRecord.updatedAt,
        };
      }
    }

    return {
      data,
      pageInfo: {
        count: totalCount,
        nextCursor,
        hasMore,
      },
      userRecommendation,
    };
  }

  public async createRecommendation(
    userId: string,
    dto: CreateRecommendationDto,
  ): Promise<any> {
    return this.prisma.client.aquilaRecommendation.create({
      data: {
        userId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        body: dto.body || null,
      },
      include: {
        user: { select: userSelect },
      },
    });
  }

  public async updateRecommendation(
    id: number,
    dto: UpdateRecommendationDto,
  ): Promise<any> {
    return this.prisma.client.aquilaRecommendation.update({
      where: { id },
      data: {
        body: dto.body !== undefined ? dto.body : undefined,
      },
      include: {
        user: { select: userSelect },
      },
    });
  }

  public async deleteRecommendation(id: number): Promise<void> {
    await this.prisma.client.aquilaRecommendation.delete({
      where: { id },
    });
  }

  public async voteRecommendation(
    recommendationId: number,
    userId: string,
    voteType: VoteActionType,
  ): Promise<RecommendationVoteResultEntity> {
    return this.prisma.client.$transaction(async (tx) => {
      const existingVote = await tx.aquilaRecommendationVote.findUnique({
        where: {
          recommendationId_userId: {
            recommendationId,
            userId,
          },
        },
      });

      let deltaUpvotes = 0;
      let deltaDownvotes = 0;
      let newVoteState: 'UPVOTE' | 'DOWNVOTE' | null = null;

      if (voteType === VoteActionType.UPVOTE) {
        if (!existingVote) {
          await tx.aquilaRecommendationVote.create({
            data: {
              recommendationId,
              userId,
              voteType: RecommendationVoteType.UPVOTE,
            },
          });
          deltaUpvotes = 1;
          newVoteState = 'UPVOTE';
        } else if (existingVote.voteType === RecommendationVoteType.UPVOTE) {
          // Toggle off
          await tx.aquilaRecommendationVote.delete({
            where: { id: existingVote.id },
          });
          deltaUpvotes = -1;
          newVoteState = null;
        } else {
          // Change DOWNVOTE -> UPVOTE
          await tx.aquilaRecommendationVote.update({
            where: { id: existingVote.id },
            data: { voteType: RecommendationVoteType.UPVOTE },
          });
          deltaUpvotes = 1;
          deltaDownvotes = -1;
          newVoteState = 'UPVOTE';
        }
      } else if (voteType === VoteActionType.DOWNVOTE) {
        if (!existingVote) {
          await tx.aquilaRecommendationVote.create({
            data: {
              recommendationId,
              userId,
              voteType: RecommendationVoteType.DOWNVOTE,
            },
          });
          deltaDownvotes = 1;
          newVoteState = 'DOWNVOTE';
        } else if (existingVote.voteType === RecommendationVoteType.DOWNVOTE) {
          // Toggle off
          await tx.aquilaRecommendationVote.delete({
            where: { id: existingVote.id },
          });
          deltaDownvotes = -1;
          newVoteState = null;
        } else {
          // Change UPVOTE -> DOWNVOTE
          await tx.aquilaRecommendationVote.update({
            where: { id: existingVote.id },
            data: { voteType: RecommendationVoteType.DOWNVOTE },
          });
          deltaUpvotes = -1;
          deltaDownvotes = 1;
          newVoteState = 'DOWNVOTE';
        }
      } else if (voteType === VoteActionType.REMOVE) {
        if (existingVote) {
          await tx.aquilaRecommendationVote.delete({
            where: { id: existingVote.id },
          });
          if (existingVote.voteType === RecommendationVoteType.UPVOTE) {
            deltaUpvotes = -1;
          } else {
            deltaDownvotes = -1;
          }
          newVoteState = null;
        }
      }

      const updated = await tx.aquilaRecommendation.update({
        where: { id: recommendationId },
        data: {
          upvotes: { increment: deltaUpvotes },
          downvotes: { increment: deltaDownvotes },
          score: { increment: deltaUpvotes - deltaDownvotes },
        },
      });

      return {
        recommendationId,
        upvotes: updated.upvotes,
        downvotes: updated.downvotes,
        score: updated.score,
        userVote: newVoteState,
      };
    });
  }
}
