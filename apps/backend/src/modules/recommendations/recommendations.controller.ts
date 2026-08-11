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
import { RecommendationsService } from './recommendations.service';
import {
  GetRecommendationsDto,
  CreateRecommendationDto,
  UpdateRecommendationDto,
  VoteRecommendationDto,
  RecommendationParamDto,
} from './recommendations.dto';
import {
  PaginatedRecommendationsEntity,
  RecommendationEntity,
  RecommendationVoteResultEntity,
} from './recommendations.entities';

type RequestWithUser = Request & {
  user?: {
    id: string;
    username: string;
    permissions: number[];
  };
};

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Public()
  @UseGuards(AuthGuard)
  @Get()
  async getRecommendations(
    @Query() query: GetRecommendationsDto,
    @Req() req: RequestWithUser,
  ): Promise<PaginatedRecommendationsEntity> {
    const userId = req.user?.id;
    return this.recommendationsService.getRecommendations(query, userId);
  }

  @Post()
  @UseGuards(AuthGuard)
  async createRecommendation(
    @Body() dto: CreateRecommendationDto,
    @Req() req: RequestWithUser,
  ): Promise<RecommendationEntity> {
    const userId = req.user!.id;
    return this.recommendationsService.createRecommendation(userId, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateRecommendation(
    @Param() params: RecommendationParamDto,
    @Body() dto: UpdateRecommendationDto,
    @Req() req: RequestWithUser,
  ): Promise<RecommendationEntity> {
    const userId = req.user!.id;
    const permissions = req.user!.permissions ?? [];
    return this.recommendationsService.updateRecommendation(
      params.id,
      userId,
      dto,
      permissions,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteRecommendation(
    @Param() params: RecommendationParamDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    const userId = req.user!.id;
    const permissions = req.user!.permissions ?? [];
    return this.recommendationsService.deleteRecommendation(
      params.id,
      userId,
      permissions,
    );
  }

  @Post(':id/vote')
  @UseGuards(AuthGuard)
  async voteRecommendation(
    @Param() params: RecommendationParamDto,
    @Body() dto: VoteRecommendationDto,
    @Req() req: RequestWithUser,
  ): Promise<RecommendationVoteResultEntity> {
    const userId = req.user!.id;
    return this.recommendationsService.voteRecommendation(
      params.id,
      userId,
      dto,
    );
  }
}
