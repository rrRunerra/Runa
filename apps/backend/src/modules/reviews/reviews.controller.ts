import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ReviewsService } from './reviews.service';
import {
  GetReviewsDto,
  CreateReviewDto,
  UpdateReviewDto,
  DeleteReviewDto,
  ReviewParamDto,
} from './reviews.dto';
import { ReviewEntity, PaginatedReviewsEntity } from './reviews.entities';

type RequestWithUser = Request & {
  user?: {
    id: string;
    username: string;
    permissions: number[];
  };
};

@Controller('reviews')
export class ReviewsController {
  private readonly moduleCode = 'ReCtr-';

  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @UseGuards(AuthGuard)
  @Get()
  async getReviews(
    @Query() query: GetReviewsDto,
    @Req() req: RequestWithUser,
  ): Promise<PaginatedReviewsEntity> {
    const username = req.user?.username;
    return this.reviewsService.getReviews(query, username);
  }

  @Post()
  @UseGuards(AuthGuard)
  async createReview(
    @Body() dto: CreateReviewDto,
    @Req() req: RequestWithUser,
  ): Promise<ReviewEntity> {
    const username = req.user!.username;
    return this.reviewsService.createReview(username, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateReview(
    @Param() params: ReviewParamDto,
    @Body() dto: UpdateReviewDto,
    @Req() req: RequestWithUser,
  ): Promise<ReviewEntity> {
    const username = req.user!.username;
    const permissions = req.user!.permissions ?? [];
    return this.reviewsService.updateReview(
      params.id,
      username,
      dto,
      permissions,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteReview(
    @Param() params: ReviewParamDto,
    @Query() query: DeleteReviewDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    const username = req.user!.username;
    const permissions = req.user!.permissions ?? [];
    return this.reviewsService.deleteReview(
      params.id,
      query.mediaType,
      username,
      permissions,
    );
  }
}
