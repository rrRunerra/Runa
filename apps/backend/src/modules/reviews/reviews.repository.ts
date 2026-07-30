import { Injectable } from '@nestjs/common';
import { MediaType } from '@runa/database';
import { PrismaService } from '../../providers/database/prisma.service';
import { ReviewEntity, PaginatedReviewsEntity } from './reviews.entities';
import { CreateReviewDto, UpdateReviewDto } from './reviews.dto';

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
};

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getModel(mediaType: MediaType): { delegate: any; fkField: string } {
    switch (mediaType) {
      case MediaType.ANIME:
        return { delegate: this.prisma.client.aquilaAnimeReview, fkField: 'animeId' };
      case MediaType.MANGA:
        return { delegate: this.prisma.client.aquilaMangaReview, fkField: 'mangaId' };
      case MediaType.MOVIE:
        return { delegate: this.prisma.client.aquilaMovieReview, fkField: 'movieId' };
      case MediaType.TV:
        return { delegate: this.prisma.client.aquilaTvReview, fkField: 'tvId' };
      case MediaType.GAME:
        return { delegate: this.prisma.client.aquilaGameReview, fkField: 'gameId' };
      case MediaType.BOOK:
        return { delegate: this.prisma.client.aquilaBookReview, fkField: 'bookId' };
      default:
        throw new Error(`Unsupported media type for reviews: ${mediaType}`);
    }
  }

  public async findReviewByUser(
    mediaType: MediaType,
    mediaId: number,
    username: string,
  ): Promise<ReviewEntity | null> {
    const { delegate, fkField } = this.getModel(mediaType);
    const record = await delegate.findUnique({
      where: {
        [`username_${fkField}`]: {
          username,
          [fkField]: mediaId,
        },
      },
      include: {
        user: { select: userSelect },
      },
    });
    if (!record) return null;
    return { ...record, mediaType, mediaId };
  }

  public async findReviewById(
    mediaType: MediaType,
    id: number,
  ): Promise<ReviewEntity | null> {
    const { delegate, fkField } = this.getModel(mediaType);
    const record = await delegate.findUnique({
      where: { id },
      include: {
        user: { select: userSelect },
      },
    });
    if (!record) return null;
    const mediaId = record[fkField];
    return { ...record, mediaType, mediaId };
  }

  public async paginateReviews(
    mediaType: MediaType,
    mediaId: number,
    cursor?: string,
    take: number = 10,
  ): Promise<PaginatedReviewsEntity> {
    const { delegate, fkField } = this.getModel(mediaType);
    const cursorValue = cursor ? Number(cursor) : undefined;

    const result = await delegate.paginate({
      take,
      cursor: cursorValue,
      cursorField: 'id',
      where: { [fkField]: mediaId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: userSelect },
      },
    });

    const data: ReviewEntity[] = result.data.map((r: any) => ({
      ...r,
      mediaType,
      mediaId,
    }));

    return {
      data,
      pageInfo: result.pageInfo,
    };
  }

  public async createReview(
    username: string,
    dto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    const { delegate, fkField } = this.getModel(dto.mediaType);
    const record = await delegate.create({
      data: {
        username,
        [fkField]: dto.mediaId,
        summary: dto.summary,
        body: dto.body,
        score: dto.score,
        isSpoiler: dto.isSpoiler ?? false,
      },
      include: {
        user: { select: userSelect },
      },
    });

    return {
      ...record,
      mediaType: dto.mediaType,
      mediaId: dto.mediaId,
    };
  }

  public async updateReview(
    id: number,
    mediaType: MediaType,
    dto: UpdateReviewDto,
  ): Promise<ReviewEntity> {
    const { delegate, fkField } = this.getModel(mediaType);
    const dataToUpdate: any = {};
    if (dto.summary !== undefined) dataToUpdate.summary = dto.summary;
    if (dto.body !== undefined) dataToUpdate.body = dto.body;
    if (dto.score !== undefined) dataToUpdate.score = dto.score;
    if (dto.isSpoiler !== undefined) dataToUpdate.isSpoiler = dto.isSpoiler;

    const record = await delegate.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: { select: userSelect },
      },
    });

    return {
      ...record,
      mediaType,
      mediaId: record[fkField],
    };
  }

  public async deleteReview(
    id: number,
    mediaType: MediaType,
  ): Promise<void> {
    const { delegate } = this.getModel(mediaType);
    await delegate.delete({
      where: { id },
    });
  }
}
