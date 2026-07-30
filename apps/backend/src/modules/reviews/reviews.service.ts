import { Injectable, Logger } from '@nestjs/common';
import { MediaType } from '@runa/database';
import { AquilaBitField } from '@runa/permissions';
import {
  rrConflictException,
  rrForbiddenException,
  rrNotFoundException,
} from 'src/providers/error';
import { ReviewsRepository } from './reviews.repository';
import { GetReviewsDto, CreateReviewDto, UpdateReviewDto } from './reviews.dto';
import { ReviewEntity, PaginatedReviewsEntity } from './reviews.entities';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly moduleCode = 'ReSve-';

  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  public async getReviews(
    dto: GetReviewsDto,
    username?: string,
  ): Promise<PaginatedReviewsEntity> {
    const paginated = await this.reviewsRepository.paginateReviews(
      dto.mediaType,
      dto.mediaId,
      dto.cursor,
      dto.take ?? 10,
    );

    let userReview: ReviewEntity | null = null;
    if (username) {
      userReview = await this.reviewsRepository.findReviewByUser(
        dto.mediaType,
        dto.mediaId,
        username,
      );
    }

    return {
      ...paginated,
      userReview,
    };
  }

  public async createReview(
    username: string,
    dto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    const existing = await this.reviewsRepository.findReviewByUser(
      dto.mediaType,
      dto.mediaId,
      username,
    );

    if (existing) {
      throw new rrConflictException(`${this.moduleCode}RAE001`, {
        message: 'You have already submitted a review for this media',
      });
    }

    return this.reviewsRepository.createReview(username, dto);
  }

  public async updateReview(
    id: number,
    username: string,
    dto: UpdateReviewDto,
    userPermissions: number[] = [],
  ): Promise<ReviewEntity> {
    const review = await this.reviewsRepository.findReviewById(
      dto.mediaType,
      id,
    );

    if (!review) {
      throw new rrNotFoundException(`${this.moduleCode}RNF001`, {
        message: 'Review not found',
      });
    }

    const bitfield = AquilaBitField.fromRaw(userPermissions);
    const isOwner = review.username.toLowerCase() === username.toLowerCase();
    const canManage =
      bitfield.has('MANAGE_REVIEWS') || bitfield.has('MANAGE');

    if (!isOwner && !canManage) {
      throw new rrForbiddenException(`${this.moduleCode}YDNHPTRM001`, {
        message: 'You do not have permission to edit this review',
      });
    }

    return this.reviewsRepository.updateReview(id, dto.mediaType, dto);
  }

  public async deleteReview(
    id: number,
    mediaType: MediaType,
    username: string,
    userPermissions: number[] = [],
  ): Promise<{ success: boolean }> {
    const review = await this.reviewsRepository.findReviewById(mediaType, id);

    if (!review) {
      throw new rrNotFoundException(`${this.moduleCode}RNF001`, {
        message: 'Review not found',
      });
    }

    const bitfield = AquilaBitField.fromRaw(userPermissions);
    const isOwner = review.username.toLowerCase() === username.toLowerCase();
    const canManage =
      bitfield.has('MANAGE_REVIEWS') || bitfield.has('MANAGE');

    if (!isOwner && !canManage) {
      throw new rrForbiddenException(`${this.moduleCode}YDNHPTRM001`, {
        message: 'You do not have permission to delete this review',
      });
    }

    await this.reviewsRepository.deleteReview(id, mediaType);
    return { success: true };
  }
}
